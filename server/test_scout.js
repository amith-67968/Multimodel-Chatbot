require('dotenv').config({ path: __dirname + '/.env' });
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testScout() {
    try {
        const stream = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                { role: 'system', content: 'You are a knowledgeable AI assistant.' },
                { role: 'user', content: 'Hello' }
            ],
            temperature: 0.7,
            max_tokens: 4096,
            stream: true,
        });

        for await (const chunk of stream) {
            process.stdout.write(chunk.choices[0]?.delta?.content || '');
        }
        console.log('\nSuccess');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testScout();
