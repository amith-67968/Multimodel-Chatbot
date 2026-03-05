const { chatWithText, streamChatWithText } = require('./aiService');
const { getConversationSummary, buildMemoryAwareHistory, updateMemoryIfNeeded } = require('./memoryService');

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
async function handleChat(message, history, mode, userId, conversationId) {
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
async function prepareStreamChat(message, history, mode, userId, conversationId) {
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

    const stream = streamChatWithText(message, effectiveHistory, mode);

    // Callback for the route handler to invoke after streaming finishes
    const onComplete = (fullReply) => {
        if (userId && conversationId && fullReply) {
            const fullHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: fullReply }];
            updateMemoryIfNeeded(userId, conversationId, fullHistory).catch((err) =>
                console.error('[Memory] Background update failed:', err.message)
            );
        }
    };

    return { stream, onComplete };
}

module.exports = { handleChat, prepareStreamChat };
