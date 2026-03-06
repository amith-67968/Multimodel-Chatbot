const Groq = require('groq-sdk');
const { withRetry } = require('../services/aiService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/** Maximum image size in bytes (10 MB) */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Minimum plausible image size in bytes */
const MIN_IMAGE_SIZE = 100;

/**
 * Supported image MIME types
 */
const SUPPORTED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
]);

/**
 * Human-readable label for a MIME type.
 * @param {string} mime
 * @returns {string}
 */
function mimeLabel(mime) {
    const labels = {
        'image/jpeg': 'JPEG',
        'image/png': 'PNG',
        'image/gif': 'GIF',
        'image/webp': 'WebP',
        'image/bmp': 'BMP',
    };
    return labels[mime] || 'Image';
}

/**
 * Format bytes into a human-readable string (e.g. "1.2 MB").
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Detect and validate the image MIME type.
 * Falls back to the provided mimeType hint if magic-byte detection
 * doesn't match a known signature.
 *
 * @param {Buffer} buffer  - Raw image bytes
 * @param {string} mimeHint - MIME type reported by the client / multer
 * @returns {string} Validated MIME type
 */
function detectImageType(buffer, mimeHint = 'image/jpeg') {
    // Quick magic-byte sniff
    const hex = buffer.slice(0, 8).toString('hex');

    const signatures = {
        'ffd8ff': 'image/jpeg',
        '89504e47': 'image/png',
        '47494638': 'image/gif',
        '52494646': 'image/webp',   // RIFF header (WebP)
        '424d': 'image/bmp',
    };

    for (const [sig, type] of Object.entries(signatures)) {
        if (hex.startsWith(sig)) return type;
    }

    // Trust the client hint if we can't detect from bytes
    return SUPPORTED_TYPES.has(mimeHint) ? mimeHint : 'image/jpeg';
}

/**
 * Validate that the file looks like a real, supported image and isn't too large.
 *
 * @param {{ buffer: Buffer, mimetype?: string, size?: number }} file
 * @throws {Error} if validation fails
 */
function validateImage(file) {
    const { buffer } = file;
    const size = file.size ?? buffer.length;

    if (!buffer || buffer.length === 0) {
        throw new Error('Image file is empty.');
    }
    if (size < MIN_IMAGE_SIZE) {
        throw new Error('File is too small to be a valid image.');
    }
    if (size > MAX_IMAGE_SIZE) {
        throw new Error(`Image exceeds the ${formatFileSize(MAX_IMAGE_SIZE)} size limit (yours is ${formatFileSize(size)}).`);
    }
}

/**
 * Analyse an uploaded image file.
 *
 * 1. Validates file constraints (size, emptiness).
 * 2. Detects / validates the image type from raw bytes.
 * 3. Converts the buffer to a base64 data-URL.
 * 4. Sends the image to a vision-capable model with a descriptive prompt.
 *
 * @param {{ buffer: Buffer, mimetype: string, originalname?: string, size?: number }} file
 *        A multer-style file object
 * @param {string} [customPrompt] Optional custom analysis prompt
 * @returns {Promise<{ description: string, mimeType: string, typeLabel: string, imageData: string, size: number, sizeLabel: string }>}
 */
async function analyzeImage(file, customPrompt) {
    validateImage(file);

    const { buffer, mimetype, originalname = 'image', size = buffer.length } = file;

    const mimeType = detectImageType(buffer, mimetype);
    const typeLabel = mimeLabel(mimeType);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const prompt = customPrompt ||
        'Analyze this image in detail. Describe what you see, identify any text, ' +
        'diagrams, or notable elements, and provide a helpful explanation.';

    try {
        const description = await withRetry(async () => {
            const completion = await groq.chat.completions.create({
                model: VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: dataUrl } },
                        ],
                    },
                ],
                temperature: 0.7,
                max_tokens: 4096,
            });
            return completion.choices[0].message.content;
        });

        return {
            description,
            mimeType,
            typeLabel,
            imageData: base64,
            size,
            sizeLabel: formatFileSize(size),
        };
    } catch (err) {
        throw new Error(`Vision model failed to analyse the image: ${err.message}`);
    }
}

/**
 * Answer a follow-up question about a previously uploaded image.
 *
 * @param {{ imageData: string, mimeType: string }} image
 *        Base64-encoded image data and its MIME type
 * @param {string} question - The user's question about the image
 * @returns {Promise<string>} The model's answer
 */
async function answerImageQuestion(image, question) {
    const { imageData, mimeType } = image;

    if (!imageData || !mimeType) {
        throw new Error('Image data and MIME type are required for follow-up questions.');
    }

    const dataUrl = `data:${mimeType};base64,${imageData}`;

    try {
        return await withRetry(async () => {
            const completion = await groq.chat.completions.create({
                model: VISION_MODEL,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: question || 'Describe this image.',
                            },
                            {
                                type: 'image_url',
                                image_url: { url: dataUrl },
                            },
                        ],
                    },
                ],
                temperature: 0.7,
                max_tokens: 4096,
            });
            return completion.choices[0].message.content;
        });
    } catch (err) {
        throw new Error(`Vision model failed to answer the question: ${err.message}`);
    }
}

module.exports = { analyzeImage, answerImageQuestion, detectImageType, formatFileSize, mimeLabel };
