const express = require('express');
const router = express.Router();
const { chatWithText, streamChatWithText } = require('../services/aiService');

// POST /api/chat – original non-streaming endpoint (kept as fallback)
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

// POST /api/chat/stream – SSE streaming endpoint
router.post('/stream', async (req, res) => {
    const { message, history = [], mode = 'detailed' } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    let aborted = false;

    req.on('close', () => {
        aborted = true;
    });

    try {
        const stream = streamChatWithText(message, history, mode);

        for await (const token of stream) {
            if (aborted) break;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }

        if (!aborted) {
            res.write('data: [DONE]\n\n');
        }
    } catch (error) {
        console.error('Stream error:', error.message || error);
        const isRateLimit = error.message?.includes('429') || error.message?.includes('rate') || error.message?.includes('quota');
        const errorMsg = isRateLimit
            ? 'API rate limit reached. Please wait a moment and try again.'
            : 'Failed to generate response';

        if (!aborted) {
            res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        }
    } finally {
        if (!aborted) {
            res.end();
        }
    }
});

module.exports = router;
