/**
 * ═══════════════════════════════════════════════════════════════════
 *  Embedding Service (Thin Wrapper)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Re-exports the embedding functions from lib/embeddings.js.
 *  This service layer exists so that ragService.js and other
 *  consumers can import from the services/ directory consistently.
 *
 *  The actual embedding logic (HF Inference SDK, model selection)
 *  lives in lib/embeddings.js.
 * ═══════════════════════════════════════════════════════════════════
 */

const { generateEmbedding, generateEmbeddings, EMBEDDING_MODEL } = require('../lib/embeddings');

module.exports = { generateEmbedding, generateEmbeddings, EMBEDDING_MODEL };
