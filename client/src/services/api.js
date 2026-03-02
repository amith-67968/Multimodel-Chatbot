import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 120000,
});

/**
 * Send a text chat message
 */
export async function sendMessage(message, history = [], mode = 'detailed') {
    const { data } = await api.post('/chat', { message, history, mode });
    return data.reply;
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
