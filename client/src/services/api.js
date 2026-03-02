import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
});

/**
 * Send a text chat message (non-streaming fallback)
 */
export async function sendMessage(message, history = [], mode = 'detailed') {
    const { data } = await api.post('/chat', { message, history, mode });
    return data.reply;
}

/**
 * Stream a text chat message via SSE
 * @param {string} message
 * @param {Array} history
 * @param {string} mode
 * @param {object} options - { onChunk, onDone, onError, signal }
 */
export async function streamMessage(message, history = [], mode = 'detailed', { onChunk, onDone, onError, signal } = {}) {
    const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history, mode }),
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
 * Upload a PDF and get extracted text + summary
 */
export async function uploadPDF(file, mode = 'detailed') {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('mode', mode);
    const { data } = await api.post('/pdf/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
}

/**
 * Ask a question about a PDF document
 */
export async function askPDFQuestion(documentText, question, mode = 'detailed') {
    const { data } = await api.post('/pdf/ask', { documentText, question, mode });
    return data.reply;
}
