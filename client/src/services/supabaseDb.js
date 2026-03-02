import { supabase } from '../lib/supabaseClient';

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
