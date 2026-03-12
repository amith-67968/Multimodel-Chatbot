require('dotenv').config({ path: __dirname + '/.env' });
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testModels() {
    const models = [
        'llama-3.3-70b-versatile',
        'mixtral-8x7b-32768',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'llama-3.1-8b-instant'
    ];

    for (const model of models) {
        console.log(`Testing model: ${model}`);
        try {
            const startTime = Date.now();
            const completion = await groq.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: 'Say hello in 3 words' }],
                temperature: 0.7,
                max_tokens: 50,
            });
            const latency = Date.now() - startTime;
            console.log(`Success: ${model} - Latency: ${latency}ms - Reply: ${completion.choices[0].message.content.trim()}`);
        } catch (error) {
            console.error(`Error with ${model}: ${error.status} - ${error.message}`);
        }
        console.log('---');
    }
}

testModels();
