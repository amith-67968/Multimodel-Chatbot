const { getSupabaseAdmin } = require('./supabaseAdmin');
const { generateEmbedding, generateEmbeddings } = require('./embeddingService');

// ── Chunking Configuration ──────────────────────────────────────────
const DEFAULT_CHUNK_SIZE = 500;      // target characters per chunk
const DEFAULT_CHUNK_OVERLAP = 50;    // overlap between consecutive chunks

/**
 * Split text into semantic chunks with overlap.
 * Tries to split on sentence boundaries for cleaner chunks.
 *
 * @param {string} text - The full document text
 * @param {object} [options]
 * @param {number} [options.chunkSize=500]
 * @param {number} [options.chunkOverlap=50]
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, { chunkSize = DEFAULT_CHUNK_SIZE, chunkOverlap = DEFAULT_CHUNK_OVERLAP } = {}) {
    if (!text || text.trim().length === 0) return [];

    // Normalize whitespace
    const cleaned = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

    // Split into sentences (keep delimiter attached)
    const sentences = cleaned.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [cleaned];

    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length + 1 > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Start next chunk with overlap from the end of the current chunk
            if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
                // Take the last chunkOverlap characters, but try to start at a word boundary
                const overlapText = currentChunk.slice(-chunkOverlap);
                const wordBoundary = overlapText.indexOf(' ');
                currentChunk = wordBoundary >= 0 ? overlapText.slice(wordBoundary + 1) : overlapText;
            } else {
                currentChunk = '';
            }
        }

        currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }

    // Push the last chunk
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Ingest a PDF document: chunk text → generate embeddings → store in Supabase.
 *
 * @param {string} userId - The user's UUID
 * @param {string} filename - Original PDF filename
 * @param {string} text - Full extracted text from the PDF
 * @param {number} pageCount - Number of pages
 * @param {number} fileSize - File size in bytes
 * @returns {Promise<{ documentId: string, chunkCount: number }>}
 */
async function ingestDocument(userId, filename, text, pageCount, fileSize) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
        throw new Error('Supabase is not configured — RAG features require Supabase.');
    }

    // 1. Chunk the text
    const chunks = chunkText(text);
    if (chunks.length === 0) {
        throw new Error('No text content found in the PDF to process.');
    }
    console.log(`[RAG] Chunked "${filename}" into ${chunks.length} chunks`);

    // 2. Create the document metadata record
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
            user_id: userId,
            filename,
            page_count: pageCount,
            file_size: fileSize,
            chunk_count: chunks.length,
        })
        .select('id')
        .single();

    if (docError) {
        throw new Error(`Failed to create document record: ${docError.message}`);
    }

    const documentId = doc.id;
    console.log(`[RAG] Created document record: ${documentId}`);

    // 3. Generate embeddings in batches (HF API can handle batches, but let's limit batch size)
    const BATCH_SIZE = 20;
    const allEmbeddings = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        console.log(`[RAG] Generating embeddings for chunks ${i + 1}–${Math.min(i + BATCH_SIZE, chunks.length)}...`);
        const batchEmbeddings = await generateEmbeddings(batch);
        allEmbeddings.push(...batchEmbeddings);
    }

    // 4. Store chunks with embeddings in Supabase
    const rows = chunks.map((content, index) => ({
        document_id: documentId,
        user_id: userId,
        chunk_index: index,
        content,
        embedding: JSON.stringify(allEmbeddings[index]),
    }));

    // Insert in batches to avoid payload limits
    const INSERT_BATCH = 50;
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
        const batch = rows.slice(i, i + INSERT_BATCH);
        const { error: insertError } = await supabase
            .from('document_chunks')
            .insert(batch);

        if (insertError) {
            // Clean up on failure
            await supabase.from('documents').delete().eq('id', documentId);
            throw new Error(`Failed to insert chunks: ${insertError.message}`);
        }
    }

    console.log(`[RAG] Stored ${chunks.length} chunks with embeddings for document ${documentId}`);
    return { documentId, chunkCount: chunks.length };
}

/**
 * Search for relevant chunks using vector similarity.
 *
 * @param {string} userId - The user's UUID
 * @param {string} documentId - The document UUID
 * @param {string} queryText - The user's question
 * @param {number} [topK=5] - Number of top results to return
 * @returns {Promise<Array<{ id: string, chunk_index: number, content: string, similarity: number }>>}
 */
async function searchChunks(userId, documentId, queryText, topK = 5) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
        throw new Error('Supabase is not configured — RAG features require Supabase.');
    }

    // 1. Generate embedding for the query
    console.log(`[RAG] Generating query embedding...`);
    const queryEmbedding = await generateEmbedding(queryText);

    // 2. Call the Supabase RPC function for similarity search
    const { data, error } = await supabase.rpc('match_document_chunks', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_user_id: userId,
        match_document_id: documentId,
        match_count: topK,
        match_threshold: 0.3,
    });

    if (error) {
        throw new Error(`Similarity search failed: ${error.message}`);
    }

    console.log(`[RAG] Found ${data.length} relevant chunks (top ${topK} requested)`);
    return data;
}

/**
 * Build a RAG context prompt from retrieved chunks.
 *
 * @param {Array<{ chunk_index: number, content: string, similarity: number }>} chunks
 * @param {string} question
 * @returns {string} Formatted context for the LLM
 */
function buildRAGPrompt(chunks, question) {
    if (!chunks || chunks.length === 0) {
        return `The user asked: "${question}"\n\nNo relevant context was found in the document. Please let the user know that the answer could not be found in the uploaded document.`;
    }

    // Sort by chunk_index for logical flow
    const sorted = [...chunks].sort((a, b) => a.chunk_index - b.chunk_index);

    const contextParts = sorted.map(
        (chunk, i) => `[Chunk ${i + 1} | Relevance: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`
    );

    return `Based on the following relevant excerpts from the uploaded document, answer the user's question.

--- RELEVANT DOCUMENT EXCERPTS ---
${contextParts.join('\n\n')}
--- END OF EXCERPTS ---

User question: ${question}`;
}

/**
 * Delete a document and all its chunks (cascade).
 *
 * @param {string} documentId
 */
async function deleteDocument(documentId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

    if (error) {
        console.error(`[RAG] Failed to delete document ${documentId}:`, error.message);
    } else {
        console.log(`[RAG] Deleted document ${documentId} and associated chunks`);
    }
}

/**
 * Get representative text from a document for summarization.
 * Returns the first N chunks concatenated (avoids sending entire document).
 *
 * @param {string} text - Full document text
 * @param {number} [maxChars=8000] - Max characters to return
 * @returns {string}
 */
function getRepresentativeText(text, maxChars = 8000) {
    const chunks = chunkText(text);
    let result = '';
    for (const chunk of chunks) {
        if (result.length + chunk.length + 2 > maxChars) break;
        result += (result ? '\n\n' : '') + chunk;
    }
    return result || text.substring(0, maxChars);
}

module.exports = {
    chunkText,
    ingestDocument,
    searchChunks,
    buildRAGPrompt,
    deleteDocument,
    getRepresentativeText,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_CHUNK_OVERLAP,
};
