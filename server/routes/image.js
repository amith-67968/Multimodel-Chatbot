const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { handleImageAnalysis, handleImageQuestion } = require('../services/visionService');

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|bmp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype.split('/')[1]);
        if (ext || mime) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, WebP, BMP) are allowed'));
        }
    },
});

// POST /api/image – Upload and analyse an image
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        const customPrompt = req.body?.prompt || undefined;
        const result = await handleImageAnalysis(req.file, customPrompt);

        res.json({
            reply: result.description,
            filename: req.file.originalname,
            size: result.size,
            sizeLabel: result.sizeLabel,
            mimeType: result.mimeType,
            typeLabel: result.typeLabel,
            imageData: result.imageData,
        });
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze image' });
    }
});

// POST /api/image/ask – Ask a follow-up question about an uploaded image
router.post('/ask', express.json(), async (req, res) => {
    try {
        const { imageData, mimeType, question } = req.body;

        if (!imageData || !mimeType || !question) {
            return res.status(400).json({ error: 'imageData, mimeType, and question are required' });
        }

        const reply = await handleImageQuestion({ imageData, mimeType }, question);
        res.json({ reply });
    } catch (error) {
        console.error('Image Q&A error:', error);
        res.status(500).json({ error: 'Failed to answer question about image', details: error.message });
    }
});

module.exports = router;

