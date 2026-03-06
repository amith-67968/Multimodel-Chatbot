const { chatWithText, streamChatWithText } = require('./aiService');
const { getConversationSummary, buildMemoryAwareHistory, updateMemoryIfNeeded } = require('./memoryService');
const { saveMessage, getRecentMessages } = require('../lib/memory');

/**
 * Handle a non-streaming text chat request.
 * Builds memory-aware history, calls the LLM, and triggers background memory update.
 *
 * @param {string} message - The user's message
 * @param {Array} history - Conversation history
 * @param {string} mode - 'detailed' or 'beginner'
 * @param {string} [userId] - User UUID (for memory features)
 * @param {string} [conversationId] - Conversation UUID (for memory features)
 * @returns {Promise<string>} The assistant's reply
 */
async function handleChat(message, history, mode, userId, conversationId, model) {
    // Load persisted messages as base history when conversationId is available
    let effectiveHistory = history;
    if (conversationId) {
        const persisted = await getRecentMessages(conversationId);
        if (persisted.length > 0) {
            effectiveHistory = persisted;
        }
    }

    // Layer summary-based memory on top if userId/conversationId provided
    if (userId && conversationId) {
        const storedSummary = await getConversationSummary(userId, conversationId);
        const result = buildMemoryAwareHistory(storedSummary, effectiveHistory);
        effectiveHistory = result.history;
    }

    // Save user message to DB (non-blocking)
    if (conversationId) {
        saveMessage(conversationId, 'user', message).catch((err) =>
            console.error('[Memory] Failed to save user message:', err.message)
        );
    }

    const reply = await chatWithText(message, effectiveHistory, mode, model);

    // Save assistant response to DB (non-blocking)
    if (conversationId) {
        saveMessage(conversationId, 'assistant', reply).catch((err) =>
            console.error('[Memory] Failed to save assistant message:', err.message)
        );
    }

    // Update summary memory in background (non-blocking)
    if (userId && conversationId) {
        const fullHistory = [...effectiveHistory, { role: 'user', content: message }, { role: 'assistant', content: reply }];
        updateMemoryIfNeeded(userId, conversationId, fullHistory).catch((err) =>
            console.error('[Memory] Background update failed:', err.message)
        );
    }

    return reply;
}

/**
 * Prepare a streaming text chat request.
 * Resolves memory-aware history and returns the LLM token stream directly,
 * along with a cleanup function to update memory after streaming completes.
 *
 * Using a preparation pattern instead of an async generator wrapper avoids
 * nested async generator issues observed in Node.js v24+.
 *
 * @param {string} message - The user's message
 * @param {Array} history - Conversation history
 * @param {string} mode - 'detailed' or 'beginner'
 * @param {string} [userId] - User UUID (for memory features)
 * @param {string} [conversationId] - Conversation UUID (for memory features)
 * @returns {Promise<{ stream: AsyncGenerator<string>, onComplete: (fullReply: string) => void }>}
 */
async function prepareStreamChat(message, history, mode, userId, conversationId, model) {
    // Load persisted messages as base history when conversationId is available
    let effectiveHistory = history;
    if (conversationId) {
        try {
            const persisted = await getRecentMessages(conversationId);
            if (persisted.length > 0) {
                effectiveHistory = persisted;
            }
        } catch (err) {
            console.error('[Memory] Failed to load persisted messages:', err.message);
        }
    }

    // Layer summary-based memory on top if userId/conversationId provided
    if (userId && conversationId) {
        try {
            const storedSummary = await getConversationSummary(userId, conversationId);
            const result = buildMemoryAwareHistory(storedSummary, effectiveHistory);
            effectiveHistory = result.history;
        } catch (err) {
            console.error('[Memory] Failed to load summary, using full history:', err.message);
        }
    }

    // Save user message to DB (non-blocking)
    if (conversationId) {
        saveMessage(conversationId, 'user', message).catch((err) =>
            console.error('[Memory] Failed to save user message:', err.message)
        );
    }

    const stream = streamChatWithText(message, effectiveHistory, mode, model);

    // Callback for the route handler to invoke after streaming finishes
    const onComplete = (fullReply) => {
        // Save assistant response to DB
        if (conversationId && fullReply) {
            saveMessage(conversationId, 'assistant', fullReply).catch((err) =>
                console.error('[Memory] Failed to save assistant message:', err.message)
            );
        }
        // Update summary memory in background
        if (userId && conversationId && fullReply) {
            const fullHistory = [...effectiveHistory, { role: 'user', content: message }, { role: 'assistant', content: fullReply }];
            updateMemoryIfNeeded(userId, conversationId, fullHistory).catch((err) =>
                console.error('[Memory] Background update failed:', err.message)
            );
        }
    };

    return { stream, onComplete };
}

module.exports = { handleChat, prepareStreamChat };
