const express = require('express');
const router = express.Router();
const { chatWithText } = require('../services/aiService');

// POST /api/chat
router.post('/', async (req, res) => {
    try {
        const { message, history = [], mode = 'detailed' } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await chatWithText(message, history, mode);
        res.json({ reply });
    } catch (error) {
        console.error('Chat error:', error.message || error);
        const isRateLimit = error.message?.includes('429') || error.message?.includes('rate') || error.message?.includes('quota');
        const statusCode = isRateLimit ? 429 : 500;
        const message = isRateLimit
            ? 'API rate limit reached. Please wait a moment and try again.'
            : 'Failed to generate response';
        res.status(statusCode).json({ error: message, details: error.message });
    }
});

module.exports = router;
