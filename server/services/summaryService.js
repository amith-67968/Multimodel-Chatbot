const Groq = require('groq-sdk');
const { withRetry } = require('./aiService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Summarize a batch of conversation messages into a concise memory block.
 * Uses a lightweight/fast model to minimize cost and latency.
 *
 * @param {string|null} existingSummary - Previous summary to merge with, or null
 * @param {Array<{role: string, content: string}>} messages - Messages to summarize
 * @returns {Promise<string>} The new merged summary
 */
async function summarizeConversation(existingSummary, messages) {
    const formattedMessages = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');

    const mergeInstruction = existingSummary
        ? `Here is the existing conversation summary:\n"${existingSummary}"\n\nNow incorporate the following new messages into the summary:`
        : 'Summarize the following conversation:';

    const prompt = `${mergeInstruction}

${formattedMessages}

Produce a concise summary that captures:
- Key topics discussed
- Important facts, names, or data mentioned
- User preferences or requests
- Any decisions or conclusions reached
- Ongoing threads that need follow-up

Be concise but thorough. Write in third-person narrative form. Do not exceed 300 words.`;

    return withRetry(async () => {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: 'You are a conversation summarizer. Produce concise, factual summaries that preserve all important context for future reference. Never add information that was not in the conversation.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 512,
        });
        return completion.choices[0].message.content;
    });
}

module.exports = { summarizeConversation };
