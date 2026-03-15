import axios from 'axios';

// Base URL for deployed backend — change this when switching environments
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 120000,
});

/**
 * Send a text chat message (non-streaming fallback)
 */
export async function sendMessage(message, history = [], mode = 'detailed', model) {
    const { data } = await api.post('/chat', { message, history, mode, model });
    return data.reply;
}

/**
 * Stream a text chat message via SSE
 * @param {string} message
 * @param {Array} history
 * @param {string} mode
 * @param {object} options - { onChunk, onDone, onError, signal }
 */
export async function streamMessage(message, history = [], mode = 'detailed', { onChunk, onDone, onError, signal, userId, conversationId, model } = {}) {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, mode, userId, conversationId, model }),
        signal,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Stream request failed' }));
        throw new Error(err.error || 'Stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const data = trimmed.slice(6); // remove "data: "

                if (data === '[DONE]') {
                    onDone?.();
                    return;
                }

                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) {
                        onError?.(parsed.error);
                        return;
                    }
                    if (parsed.token) {
                        onChunk?.(parsed.token);
                    }
                } catch {
                    // ignore malformed JSON lines
                }
            }
        }
        // Stream ended without [DONE] (e.g. connection closed)
        onDone?.();
    } catch (err) {
        if (err.name === 'AbortError') {
            // User cancelled — not an error
            onDone?.();
        } else {
            onError?.(err.message || 'Stream connection lost');
        }
    }
}

/**
 * Upload and analyze an image
 */
export async function analyzeImage(file, prompt = '') {
    const formData = new FormData();
    formData.append('image', file);
    if (prompt) formData.append('prompt', prompt);
    const { data } = await api.post('/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/**
 * Ask a follow-up question about a previously uploaded image
 */
export async function askImageQuestion(imageData, mimeType, question) {
    const { data } = await api.post('/image/ask', { imageData, mimeType, question });
    return data.reply;
}

/**
 * Upload a PDF — server will chunk, embed, and store it
 */
export async function uploadPDF(file, mode = 'detailed', userId = '') {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('mode', mode);
    if (userId) formData.append('userId', userId);
    const { data } = await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/**
 * Ask a question about a PDF document using RAG
 */
export async function askPDFQuestion(documentId, userId, question, mode = 'detailed') {
    const { data } = await api.post('/pdf/ask', { documentId, userId, question, mode });
    return data.reply;
}
