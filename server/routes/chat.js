const express = require('express');
const router = express.Router();
const { chatWithText, streamChatWithText } = require('../services/aiService');
const { getConversationSummary, buildMemoryAwareHistory, updateMemoryIfNeeded } = require('../services/memoryService');

// POST /api/chat – original non-streaming endpoint (kept as fallback)
router.post('/', async (req, res) => {
    try {
        const { message, history = [], mode = 'detailed', userId, conversationId } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build memory-aware history if userId/conversationId provided
        let effectiveHistory = history;
        if (userId && conversationId) {
            const storedSummary = await getConversationSummary(userId, conversationId);
            const result = buildMemoryAwareHistory(storedSummary, history);
            effectiveHistory = result.history;
        }

        const reply = await chatWithText(message, effectiveHistory, mode);

        // Update memory in background (non-blocking)
        if (userId && conversationId) {
            const fullHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }];
            updateMemoryIfNeeded(userId, conversationId, fullHistory).catch((err) =>
                console.error('[Memory] Background update failed:', err.message)
            );
        }

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
    const { message, history = [], mode = 'detailed', userId, conversationId } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Build memory-aware history if userId/conversationId provided
    let effectiveHistory = history;
    if (userId && conversationId) {
        try {
            const storedSummary = await getConversationSummary(userId, conversationId);
            const result = buildMemoryAwareHistory(storedSummary, history);
            effectiveHistory = result.history;
        } catch (err) {
            console.error('[Memory] Failed to load summary, using full history:', err.message);
        }
    }

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    let aborted = false;
    let fullReply = '';

    req.on('close', () => {
        aborted = true;
    });

    try {
        const stream = streamChatWithText(message, effectiveHistory, mode);

        for await (const token of stream) {
            if (aborted) break;
            fullReply += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }

        if (!aborted) {
            res.write('data: [DONE]\n\n');
        }

        // Update memory in background (non-blocking)
        if (userId && conversationId && fullReply) {
            const fullHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: fullReply }];
            updateMemoryIfNeeded(userId, conversationId, fullHistory).catch((err) =>
                console.error('[Memory] Background update failed:', err.message)
            );
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
