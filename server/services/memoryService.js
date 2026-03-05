const { getSupabaseAdmin } = require('./supabaseAdmin');
const { summarizeConversation } = require('./summaryService');

const SUMMARY_THRESHOLD = 10; // Summarize when history exceeds this count
const RECENT_MESSAGES_COUNT = 6; // Keep this many recent messages in the prompt

/**
 * Retrieve the stored conversation summary from Supabase.
 * Returns { summary, summarizedUntil } or null if none exists.
 */
async function getConversationSummary(userId, conversationId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('conversation_summaries')
            .select('summary, summarized_until')
            .eq('user_id', userId)
            .eq('conversation_id', conversationId)
            .single();

        if (error || !data) return null;

        return {
            summary: data.summary,
            summarizedUntil: data.summarized_until,
        };
    } catch (err) {
        console.error('[Memory] Error fetching summary:', err.message);
        return null;
    }
}

/**
 * Build a memory-aware history array for the LLM prompt.
 *
 * If there's a stored summary and the history is long, returns:
 *   [summary-as-system-message] + [last N messages]
 *
 * Otherwise returns the full history unchanged.
 */
function buildMemoryAwareHistory(storedSummary, history) {
    if (!storedSummary || history.length <= SUMMARY_THRESHOLD) {
        return { history, usedSummary: false };
    }

    const recentMessages = history.slice(-RECENT_MESSAGES_COUNT);

    const summaryMessage = {
        role: 'user',
        content: `[CONVERSATION CONTEXT — Summary of earlier messages]\n${storedSummary.summary}\n[END OF SUMMARY — Recent messages follow]`,
    };

    return {
        history: [summaryMessage, ...recentMessages],
        usedSummary: true,
    };
}

/**
 * After an AI response, check if there are unsummarized messages
 * and update the summary if needed. Runs in the background (non-blocking).
 *
 * @param {string} userId
 * @param {string} conversationId
 * @param {Array} fullHistory - The complete message history including the latest exchange
 */
async function updateMemoryIfNeeded(userId, conversationId, fullHistory) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    if (fullHistory.length <= SUMMARY_THRESHOLD) return;

    try {
        // Fetch existing summary
        const existing = await getConversationSummary(userId, conversationId);
        const summarizedUntil = existing?.summarizedUntil || 0;

        // Determine which messages need summarizing (older messages, not the recent ones)
        const messagesToKeepRecent = RECENT_MESSAGES_COUNT;
        const cutoffIndex = fullHistory.length - messagesToKeepRecent;

        // Only summarize if there are new unsummarized messages beyond what's already captured
        if (cutoffIndex <= summarizedUntil) return;

        const newMessagesToSummarize = fullHistory.slice(summarizedUntil, cutoffIndex);

        if (newMessagesToSummarize.length === 0) return;

        console.log(`[Memory] Summarizing ${newMessagesToSummarize.length} new messages for conv ${conversationId.slice(0, 8)}...`);

        // Generate summary (merging with existing if present)
        const newSummary = await summarizeConversation(
            existing?.summary || null,
            newMessagesToSummarize
        );

        // Upsert the summary into Supabase
        const { error } = await supabase
            .from('conversation_summaries')
            .upsert(
                {
                    user_id: userId,
                    conversation_id: conversationId,
                    summary: newSummary,
                    summarized_until: cutoffIndex,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,conversation_id' }
            );

        if (error) {
            console.error('[Memory] Error upserting summary:', error.message);
        } else {
            console.log(`[Memory] Summary updated. Covered ${cutoffIndex} messages.`);
        }
    } catch (err) {
        console.error('[Memory] Error in updateMemoryIfNeeded:', err.message);
    }
}

module.exports = {
    getConversationSummary,
    buildMemoryAwareHistory,
    updateMemoryIfNeeded,
    SUMMARY_THRESHOLD,
    RECENT_MESSAGES_COUNT,
};
