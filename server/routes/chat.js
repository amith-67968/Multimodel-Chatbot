const express = require('express');
const router = express.Router();
const { handleChat, prepareStreamChat } = require('../services/chatService');
const rateLimit = require('../middleware/rateLimit');

// Apply rate limiting — 20 requests per minute per client
router.use(rateLimit({ windowMs: 60_000, maxRequests: 20 }));
// POST /api/chat – non-streaming endpoint (kept as fallback)
router.post('/', async (req, res) => {
    try {
        const { message, history = [], mode = 'detailed', userId, conversationId, model } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await handleChat(message, history, mode, userId, conversationId, model);
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
    const { message, history = [], mode = 'detailed', userId, conversationId, model } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Set SSE headers and flush immediately so the client establishes the
    // connection before we start awaiting the LLM stream.
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.flushHeaders();

    let aborted = false;
    let fullReply = '';

    // Detect client disconnection via the *response* close event.
    // NOTE: req.on('close') fires immediately in Node.js v24+ once the request
    // body is consumed, NOT when the client disconnects. Using res.on('close')
    // with a writableFinished check is the correct approach.
    res.on('close', () => {
        if (!res.writableFinished) {
            aborted = true;
        }
    });

    try {
        // Prepare memory-aware context and get the raw LLM stream
        const { stream, onComplete } = await prepareStreamChat(message, history, mode, userId, conversationId, model);

        for await (const token of stream) {
            if (aborted) break;
            fullReply += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }

        if (!aborted) {
            res.write('data: [DONE]\n\n');
        }

        // Trigger background memory update
        onComplete(fullReply);
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
