const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Model Registry ─────────────────────────────────────────────────
const MODEL_REGISTRY = {
    llama3: 'llama-3.3-70b-versatile',
    llama3_1: 'llama-3.1-8b-instant',
    vision: 'meta-llama/llama-4-scout-17b-16e-instruct',
};

const DEFAULT_MODEL = 'llama3';

/**
 * Resolve a user-facing model key to a Groq model ID.
 * Falls back to the default model if the key is unrecognised.
 *
 * @param {string} [key] - One of 'llama3', 'mixtral', 'vision'
 * @returns {string} Groq model identifier
 */
function resolveModel(key) {
    return MODEL_REGISTRY[key] || MODEL_REGISTRY[DEFAULT_MODEL];
}

/**
 * Retry wrapper with exponential backoff for rate-limited API calls
 */
async function withRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.status === 429 ||
                error.message?.includes('429') ||
                error.message?.includes('rate') ||
                error.message?.includes('quota');

            if (isRateLimit && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
                console.log(`Rate limited. Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

/**
 * Chat with text – supports conversation history
 */
async function chatWithText(message, history = [], mode = 'detailed', model) {
    const systemPrompt =
        mode === 'beginner'
            ? 'You are a friendly AI assistant. Explain everything in very simple terms, as if talking to a complete beginner. Use analogies and avoid jargon.'
            : 'You are a knowledgeable AI assistant. Provide thorough, well-structured answers with relevant details.';

    const messages = [
        { role: 'system', content: systemPrompt },
    ];

    for (const entry of history) {
        messages.push({
            role: entry.role === 'user' ? 'user' : 'assistant',
            content: entry.content,
        });
    }

    messages.push({ role: 'user', content: message });

    return withRetry(async () => {
        const completion = await groq.chat.completions.create({
            model: resolveModel(model),
            messages,
            temperature: 0.7,
            max_tokens: 4096,
        });
        return completion.choices[0].message.content;
    });
}

/**
 * Stream chat with text – yields tokens as they are generated
 */
async function* streamChatWithText(message, history = [], mode = 'detailed', model) {
    const systemPrompt =
        mode === 'beginner'
            ? 'You are a friendly AI assistant. Explain everything in very simple terms, as if talking to a complete beginner. Use analogies and avoid jargon.'
            : 'You are a knowledgeable AI assistant. Provide thorough, well-structured answers with relevant details.';

    const messages = [
        { role: 'system', content: systemPrompt },
    ];

    for (const entry of history) {
        messages.push({
            role: entry.role === 'user' ? 'user' : 'assistant',
            content: entry.content,
        });
    }

    messages.push({ role: 'user', content: message });

    const stream = await groq.chat.completions.create({
        model: resolveModel(model),
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}


/**
 * Answer questions using RAG-retrieved context (replaces chatWithDocument)
 */
async function chatWithRAGContext(ragContext, question, mode = 'detailed', model) {
    const modeInstruction =
        mode === 'beginner'
            ? 'Explain your answer in very simple terms, suitable for a beginner.'
            : 'Provide a detailed and thorough answer.';

    const messages = [
        {
            role: 'system',
            content: `You are a document analysis assistant. Answer questions based ONLY on the provided document excerpts. If the excerpts don't contain the answer, say so clearly. ${modeInstruction}`,
        },
        {
            role: 'user',
            content: ragContext,
        },
    ];

    return withRetry(async () => {
        const completion = await groq.chat.completions.create({
            model: resolveModel(model),
            messages,
            temperature: 0.7,
            max_tokens: 4096,
        });
        return completion.choices[0].message.content;
    });
}

/**
 * Generate a summary of document text
 */
async function summarizeDocument(documentText, mode = 'detailed', model) {
    const modeInstruction =
        mode === 'beginner'
            ? 'Write the summary in very simple language, suitable for a beginner.'
            : 'Provide a comprehensive and detailed summary.';

    const messages = [
        {
            role: 'system',
            content: modeInstruction,
        },
        {
            role: 'user',
            content: `Summarize the following document content. Highlight key points, main ideas, and important details.\n\n--- DOCUMENT START ---\n${documentText.substring(0, 30000)}\n--- DOCUMENT END ---`,
        },
    ];

    return withRetry(async () => {
        const completion = await groq.chat.completions.create({
            model: resolveModel(model),
            messages,
            temperature: 0.7,
            max_tokens: 4096,
        });
        return completion.choices[0].message.content;
    });
}

module.exports = { withRetry, chatWithText, streamChatWithText, chatWithRAGContext, summarizeDocument, MODEL_REGISTRY, DEFAULT_MODEL, resolveModel };
