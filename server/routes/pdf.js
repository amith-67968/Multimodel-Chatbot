const express = require('express');
const router = express.Router();
const multer = require('multer');
const { handlePDFUpload, handlePDFQuestion } = require('../services/pdfService');

// Configure multer for PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

// POST /api/pdf/upload – Extract text, chunk, embed, store, and return summary
router.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const userId = req.body.userId;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const mode = req.body.mode || 'detailed';
        const result = await handlePDFUpload(req.file.buffer, req.file.originalname, userId, mode);

        res.json(result);
    } catch (error) {
        console.error('PDF processing error:', error);
        res.status(500).json({ error: 'Failed to process PDF', details: error.message });
    }
});

// POST /api/pdf/ask – Ask questions using RAG retrieval
router.post('/ask', async (req, res) => {
    try {
        const { documentId, userId, question, mode = 'detailed' } = req.body;

        if (!documentId || !userId || !question) {
            return res.status(400).json({ error: 'documentId, userId, and question are required' });
        }

        const result = await handlePDFQuestion(documentId, userId, question, mode);
        res.json(result);
    } catch (error) {
        console.error('PDF Q&A error:', error);
        res.status(500).json({ error: 'Failed to answer question', details: error.message });
    }
});

module.exports = router;
