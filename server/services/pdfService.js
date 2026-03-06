/**
 * ═══════════════════════════════════════════════════════════════════
 *  PDF Service — RAG Pipeline Orchestrator
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Orchestrates the full PDF → RAG → Answer pipeline:
 *
 *  Upload path:
 *    1. Extract text from PDF        (pdf-parse)
 *    2. Chunk text into ~500-char     (ragService.chunkText)
 *    3. Generate HF embeddings        (embeddingService → lib/embeddings)
 *    4. Store chunks + vectors        (ragService.ingestDocument → Supabase)
 *    5. Summarize the document        (aiService.summarizeDocument)
 *
 *  Question path:
 *    1. Embed the user's question     (embeddingService.generateEmbedding)
 *    2. Vector similarity search      (ragService.searchChunks → pgvector)
 *    3. Build context prompt          (ragService.buildRAGPrompt)
 *    4. Send to LLM for answer        (aiService.chatWithRAGContext)
 *
 * ═══════════════════════════════════════════════════════════════════
 */

const pdfParse = require('pdf-parse');
const { chatWithRAGContext, summarizeDocument } = require('./aiService');
const { ingestDocument, searchChunks, buildRAGPrompt, getRepresentativeText } = require('./ragService');

/**
 * Handle PDF upload: extract text, chunk, embed, store, and generate a summary.
 *
 * @param {Buffer} fileBuffer - Raw PDF bytes
 * @param {string} originalname - Original filename
 * @param {string} userId - The user's UUID
 * @param {string} [mode='detailed'] - Summary mode ('detailed' or 'beginner')
 * @returns {Promise<{ documentId: string, summary: string, filename: string, pages: number, size: number, chunkCount: number }>}
 */
async function handlePDFUpload(fileBuffer, originalname, userId, mode = 'detailed') {
    const data = await pdfParse(fileBuffer);
    const extractedText = data.text;

    // Ingest into RAG pipeline (chunk → embed → store in Supabase pgvector)
    const { documentId, chunkCount } = await ingestDocument(
        userId,
        originalname,
        extractedText,
        data.numpages,
        fileBuffer.length
    );

    // Generate summary from representative chunks (not the entire document)
    const representativeText = getRepresentativeText(extractedText);
    const summary = await summarizeDocument(representativeText, mode);

    return {
        documentId,
        summary,
        filename: originalname,
        pages: data.numpages,
        size: fileBuffer.length,
        chunkCount,
    };
}

/**
 * Handle a PDF question using RAG retrieval.
 *
 * @param {string} documentId - The document UUID
 * @param {string} userId - The user's UUID
 * @param {string} question - The user's question
 * @param {string} [mode='detailed'] - Answer mode ('detailed' or 'beginner')
 * @returns {Promise<{ reply: string, chunksUsed: number }>}
 */
async function handlePDFQuestion(documentId, userId, question, mode = 'detailed') {
    // 1. Search for relevant chunks via vector similarity
    const relevantChunks = await searchChunks(userId, documentId, question, 5);

    // 2. Build RAG context prompt
    const ragPrompt = buildRAGPrompt(relevantChunks, question);

    // 3. Send to LLM with RAG context
    const reply = await chatWithRAGContext(ragPrompt, question, mode);

    return {
        reply,
        chunksUsed: relevantChunks.length,
    };
}

module.exports = { handlePDFUpload, handlePDFQuestion };
