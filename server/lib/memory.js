const { getSupabaseAdmin } = require('../services/supabaseAdmin');

/**
 * Save a single message to the messages table.
 *
 * @param {string} sessionId - Conversation / session identifier
 * @param {'user'|'assistant'} role
 * @param {string} content - The message body
 */
async function saveMessage(sessionId, role, content) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return; // Supabase not configured — silently skip

    try {
        const { error } = await supabase
            .from('messages')
            .insert({ session_id: sessionId, role, content });

        if (error) {
            console.error('[Memory] Error saving message:', error.message);
        }
    } catch (err) {
        console.error('[Memory] saveMessage failed:', err.message);
    }
}

/**
 * Fetch the most recent messages for a session, ordered chronologically.
 *
 * @param {string} sessionId
 * @param {number} [limit=10]
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
async function getRecentMessages(sessionId, limit = 10) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[Memory] Error fetching messages:', error.message);
            return [];
        }

        // Reverse so oldest message comes first (chronological order for the LLM)
        return (data || []).reverse();
    } catch (err) {
        console.error('[Memory] getRecentMessages failed:', err.message);
        return [];
    }
}

module.exports = { saveMessage, getRecentMessages };
