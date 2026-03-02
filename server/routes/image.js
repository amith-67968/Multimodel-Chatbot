const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyzeImage } = require('../services/aiService');

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

// POST /api/image
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required' });
        }

        const prompt = req.body.prompt || '';
        const reply = await analyzeImage(req.file.buffer, req.file.mimetype, prompt);

        res.json({
            reply,
            filename: req.file.originalname,
            size: req.file.size,
        });
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze image', details: error.message });
    }
});

module.exports = router;
