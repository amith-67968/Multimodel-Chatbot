const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Generate a single embedding vector for a text string.
 * Uses the HuggingFace Inference API with all-MiniLM-L6-v2 (384 dims).
 *
 * @param {string} text
 * @returns {Promise<number[]>} 384-dimensional float array
 */
async function generateEmbedding(text) {
    const token = process.env.HF_API_TOKEN;
    if (!token) {
        throw new Error('HF_API_TOKEN is not set in .env — required for embeddings');
    }

    const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true },
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HuggingFace API error (${response.status}): ${errBody}`);
    }

    const embedding = await response.json();
    return embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch request.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of 384-dimensional float arrays
 */
async function generateEmbeddings(texts) {
    const token = process.env.HF_API_TOKEN;
    if (!token) {
        throw new Error('HF_API_TOKEN is not set in .env — required for embeddings');
    }

    // HF Inference API supports batch inputs
    const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: texts,
            options: { wait_for_model: true },
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`HuggingFace API error (${response.status}): ${errBody}`);
    }

    const embeddings = await response.json();
    return embeddings;
}

module.exports = { generateEmbedding, generateEmbeddings };
