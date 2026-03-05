const { analyzeImage } = require('./aiService');

/**
 * Handle image analysis.
 * Accepts an image buffer and optional text prompt, returns the LLM's analysis.
 *
 * @param {Buffer} imageBuffer - Raw image bytes
 * @param {string} mimeType - Image MIME type (e.g. 'image/png')
 * @param {string} [prompt] - Optional user prompt to guide the analysis
 * @returns {Promise<string>} The analysis text from the vision model
 */
async function handleImageAnalysis(imageBuffer, mimeType, prompt) {
    return analyzeImage(imageBuffer, mimeType, prompt);
}

module.exports = { handleImageAnalysis };
