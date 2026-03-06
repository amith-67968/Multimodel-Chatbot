const { analyzeImage, answerImageQuestion } = require('../lib/imageProcessor');

/**
 * Handle initial image analysis.
 * Accepts a multer-style file object, runs type detection + vision model analysis.
 *
 * @param {object} file - { buffer, mimetype, originalname, size }
 * @param {string} [customPrompt] - Optional custom analysis prompt
 * @returns {Promise<{ description: string, mimeType: string, typeLabel: string, imageData: string, size: number, sizeLabel: string }>}
 */
async function handleImageAnalysis(file, customPrompt) {
    try {
        return await analyzeImage(file, customPrompt);
    } catch (err) {
        // Re-throw with a user-friendly prefix when missing
        if (err.message.startsWith('Vision model') || err.message.startsWith('Image') || err.message.startsWith('File')) {
            throw err; // already user-friendly
        }
        throw new Error(`Image analysis failed: ${err.message}`);
    }
}

/**
 * Handle a follow-up question about a previously uploaded image.
 *
 * @param {{ imageData: string, mimeType: string }} image - Stored image data
 * @param {string} question - User's follow-up question
 * @returns {Promise<string>} The model's answer
 */
async function handleImageQuestion(image, question) {
    try {
        return await answerImageQuestion(image, question);
    } catch (err) {
        if (err.message.startsWith('Vision model') || err.message.startsWith('Image')) {
            throw err;
        }
        throw new Error(`Image Q&A failed: ${err.message}`);
    }
}

module.exports = { handleImageAnalysis, handleImageQuestion };
