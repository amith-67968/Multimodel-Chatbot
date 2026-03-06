/**
 * ═══════════════════════════════════════════════════════════════════
 *  Embedding Generation Module
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This module is the foundation of the RAG (Retrieval Augmented
 *  Generation) pipeline. It converts text into dense vector
 *  representations (embeddings) using the Hugging Face Inference API.
 *
 *  Model:  sentence-transformers/all-MiniLM-L6-v2
 *  Output: 384-dimensional float vectors
 *
 *  These embeddings are used for:
 *    1. Indexing PDF chunks into Supabase pgvector
 *    2. Converting user questions into vectors for similarity search
 *
 *  Pipeline overview:
 *    PDF text ──► chunkText() ──► generateEmbeddings() ──► Supabase
 *                                        ▲
 *    User query ──────────────► generateEmbedding() ──► similarity search
 *
 * ═══════════════════════════════════════════════════════════════════
 */

const { HfInference } = require('@huggingface/inference');

/**
 * The embedding model used for all vector operations.
 * all-MiniLM-L6-v2 produces 384-dimensional vectors and is optimized
 * for semantic similarity tasks.
 */
const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/** @type {HfInference|null} Lazy-initialized HF client */
let hfClient = null;

/**
 * Get (or create) the Hugging Face Inference client.
 * Uses the HF_API_TOKEN environment variable for authentication.
 *
 * @returns {HfInference}
 * @throws {Error} If HF_API_TOKEN is not set
 */
function getHFClient() {
    if (hfClient) return hfClient;

    const token = process.env.HF_API_TOKEN;
    if (!token) {
        throw new Error(
            'HF_API_TOKEN is not set in .env — required for embeddings. ' +
            'Get one at https://huggingface.co/settings/tokens'
        );
    }

    hfClient = new HfInference(token);
    return hfClient;
}

/**
 * Generate a single embedding vector for a text string.
 *
 * This is typically used when embedding a user's question for
 * similarity search against stored document chunks.
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} 384-dimensional float array
 *
 * @example
 *   const vector = await generateEmbedding("What is machine learning?");
 *   // vector.length === 384
 */
async function generateEmbedding(text) {
    const hf = getHFClient();

    // The HF featureExtraction endpoint returns a vector for each input.
    // For a single string input, it returns a single 384-dim array.
    const embedding = await hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
    });

    return embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch request.
 *
 * This is used during PDF ingestion to embed all document chunks
 * efficiently in batches rather than one-by-one.
 *
 * @param {string[]} texts - Array of text strings to embed
 * @returns {Promise<number[][]>} Array of 384-dimensional float arrays
 *
 * @example
 *   const vectors = await generateEmbeddings(["chunk 1", "chunk 2"]);
 *   // vectors.length === 2, vectors[0].length === 384
 */
async function generateEmbeddings(texts) {
    const hf = getHFClient();

    // HF Inference API supports batch inputs — pass an array of strings
    // and receive an array of embedding vectors back.
    const embeddings = await hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: texts,
    });

    return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings, EMBEDDING_MODEL };
