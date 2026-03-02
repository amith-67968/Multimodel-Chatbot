const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { chatWithDocument, summarizeDocument } = require('../services/aiService');

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

// POST /api/pdf/upload – Extract text and generate summary
router.post('/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'PDF file is required' });
        }

        const data = await pdfParse(req.file.buffer);
        const extractedText = data.text;
        const mode = req.body.mode || 'detailed';

        // Generate summary
        const summary = await summarizeDocument(extractedText, mode);

        res.json({
            extractedText,
            summary,
            filename: req.file.originalname,
            pages: data.numpages,
            size: req.file.size,
        });
    } catch (error) {
        console.error('PDF processing error:', error);
        res.status(500).json({ error: 'Failed to process PDF', details: error.message });
    }
});

// POST /api/pdf/ask – Ask questions about uploaded document
router.post('/ask', async (req, res) => {
    try {
        const { documentText, question, mode = 'detailed' } = req.body;

        if (!documentText || !question) {
            return res.status(400).json({ error: 'documentText and question are required' });
        }

        const reply = await chatWithDocument(documentText, question, mode);
        res.json({ reply });
    } catch (error) {
        console.error('PDF Q&A error:', error);
        res.status(500).json({ error: 'Failed to answer question', details: error.message });
    }
});

module.exports = router;
