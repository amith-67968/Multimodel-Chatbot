import { supabase } from '../lib/supabaseClient';

// ─── Message persistence (existing `conversations` table) ───

/**
 * Save a single message to Supabase
 */
export async function saveMessage(userId, conversationId, role, content, inputType = 'text') {
    const { error } = await supabase.from('conversations').insert({
        user_id: userId,
        conversation_id: conversationId,
        role,
        content,
        input_type: inputType,
    });
    if (error) console.error('Error saving message:', error.message);
    return { error };
}

/**
 * Load all conversations for a user, grouped by conversation_id
 */
export async function loadConversations(userId) {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error loading conversations:', error.message);
        return [];
    }

    // Group messages by conversation_id
    const grouped = {};
    for (const row of data) {
        if (!grouped[row.conversation_id]) {
            grouped[row.conversation_id] = [];
        }
        grouped[row.conversation_id].push({
            id: row.id,
            role: row.role,
            content: row.content,
            inputType: row.input_type,
        });
    }

    return grouped;
}

/**
 * Delete all messages for a specific conversation
 */
export async function deleteConversation(userId, conversationId) {
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', conversationId);

    if (error) console.error('Error deleting conversation:', error.message);
    return { error };
}

// ─── Conversation metadata (new `conversation_metadata` table) ───

/**
 * Create a conversation metadata entry
 */
export async function createConversationMeta(userId, sessionId, title = 'New Chat') {
    const { error } = await supabase.from('conversation_metadata').insert({
        user_id: userId,
        session_id: sessionId,
        title,
    });
    if (error) console.error('Error creating conversation metadata:', error.message);
    return { error };
}

/**
 * Update the title of a conversation
 */
export async function updateConversationTitle(sessionId, title) {
    const { error } = await supabase
        .from('conversation_metadata')
        .update({ title })
        .eq('session_id', sessionId);
    if (error) console.error('Error updating conversation title:', error.message);
    return { error };
}

/**
 * Fetch all conversation metadata for a user, newest first
 */
export async function loadConversationList(userId) {
    const { data, error } = await supabase
        .from('conversation_metadata')
        .select('session_id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading conversation list:', error.message);
        return [];
    }

    return data || [];
}

/**
 * Delete conversation metadata
 */
export async function deleteConversationMeta(sessionId) {
    const { error } = await supabase
        .from('conversation_metadata')
        .delete()
        .eq('session_id', sessionId);
    if (error) console.error('Error deleting conversation metadata:', error.message);
    return { error };
}
