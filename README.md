# Multimodel AI Chatbot

A full-stack multimodel AI chatbot that accepts **text, voice, image, and PDF** input and provides intelligent responses with **voice playback**. Built with **Groq-powered Llama models** for lightning-fast inference.

![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Groq](https://img.shields.io/badge/Groq-Llama%20AI-orange) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20pgvector-purple) ![HuggingFace](https://img.shields.io/badge/HuggingFace-Embeddings-yellow)

## Features

### Core
- **Text Chat** – Conversational AI with streaming responses and memory
- **Voice Input** – Speak via microphone (Web Speech API)
- **Voice Assistant** – Hands-free mode: auto-send → AI responds → speaks back → listens again
- **Image Analysis** – Upload/drag-drop images for AI-powered analysis (Llama 4 Scout)
- **PDF Document Q&A** – Upload PDFs with RAG-powered retrieval (embeddings + vector search)
- **Voice Output** – Every AI response has a "Speak" button (TTS)

### AI & Models
- **Model Selector** – Choose between Llama 3.3 70B, Mixtral 8x7B, or Llama 4 Scout
- **RAG Pipeline** – PDF chunks → HuggingFace embeddings → Supabase pgvector → semantic retrieval
- **Streaming Responses** – Real-time token-by-token display with Server-Sent Events

### UI/UX
- **Syntax Highlighting** – Prism-powered code blocks with language labels and copy buttons
- **Message Timestamps** – Relative time on every message ("just now", "2m ago")
- **Drag & Drop** – Drop images or PDFs anywhere on the chat window
- **Markdown Rendering** – Full markdown support in AI responses
- **Typing Indicator** – Animated "AI is thinking..." with shimmer effect
- **Copy Response** – One-click copy on any AI message
- **Beginner / Detailed mode** – Toggle explanation complexity
- **Chat History** – Persistent sidebar with multiple conversations
- **Mobile Responsive** – Works on all screen sizes
- **Dark Theme** – Sleek dark UI with glassmorphism

### Backend
- **API Rate Limiting** – 20 requests/minute per client with standard headers
- **Analytics Dashboard** – Track conversations, messages, feature usage, response times
- **User Authentication** – Secure sign-up/login via Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Backend | Node.js, Express |
| AI Models | Groq API – Llama 3.3 70B, Mixtral 8x7B, Llama 4 Scout |
| Embeddings | HuggingFace Inference API (all-MiniLM-L6-v2) |
| Auth & DB | Supabase (Auth, PostgreSQL, pgvector) |
| Voice | Web Speech API (STT + TTS) |
| File Processing | Multer, pdf-parse |
| Syntax Highlighting | react-syntax-highlighter (Prism) |

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/amith-67968/Multimodel-Chatbot.git
cd chatbot-antigravity
```

### 2. Set your API keys

Edit `server/.env`:

```env
PORT=5000
GROQ_API_KEY=your_groq_api_key
HF_API_TOKEN=your_huggingface_token
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

- Groq key: [console.groq.com/keys](https://console.groq.com/keys)
- HuggingFace token: [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (Inference API permission)

> Supabase client credentials are configured in `client/src/lib/supabaseClient.js`.

### 3. Run Supabase migrations

Run these SQL files in your Supabase SQL Editor:
- `server/supabase_messages_migration.sql`
- `server/supabase_conversations_migration.sql`
- `server/supabase_rag_migration.sql`
- `server/supabase_analytics_migration.sql`

### 4. Install & start the backend

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:5000`

### 5. Install & start the frontend (new terminal)

```bash
cd client
npm install
npm run dev
```

App opens at `http://localhost:5173`

## Project Structure

```
chatbot-antigravity/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx       # Chat interface with drag-drop
│   │   │   ├── MessageBubble.jsx    # Messages with syntax highlighting
│   │   │   ├── VoiceInput.jsx       # Microphone (STT)
│   │   │   ├── ImageUpload.jsx      # Image upload
│   │   │   ├── FileUpload.jsx       # PDF upload
│   │   │   └── ProtectedRoute.jsx   # Auth guard
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Landing page
│   │   │   ├── Login.jsx            # Login
│   │   │   ├── Register.jsx         # Registration
│   │   │   ├── Chat.jsx             # Main chat + sidebar
│   │   │   └── AdminDashboard.jsx   # Analytics dashboard
│   │   ├── services/
│   │   │   ├── api.js               # API helpers
│   │   │   └── supabaseDb.js        # Supabase DB operations
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Auth provider
│   │   ├── utils/
│   │   │   └── speech.js            # TTS utility
│   │   └── index.css                # Global styles
│   └── package.json
│
├── server/                      # Express backend
│   ├── routes/
│   │   ├── chat.js                  # POST /api/chat + streaming
│   │   ├── image.js                 # POST /api/image
│   │   ├── pdf.js                   # POST /api/pdf/*
│   │   └── analytics.js            # GET /api/analytics
│   ├── services/
│   │   ├── aiService.js             # Groq API + model registry
│   │   ├── chatService.js           # Chat orchestration
│   │   ├── ragService.js            # RAG retrieval pipeline
│   │   ├── embeddingService.js      # Chunk + embed + store
│   │   └── analyticsService.js      # Usage tracking
│   ├── middleware/
│   │   └── rateLimit.js             # Rate limiter (20 req/min)
│   ├── lib/
│   │   ├── embeddings.js            # HuggingFace embeddings
│   │   └── imageProcessor.js        # Vision model processor
│   ├── supabase_*_migration.sql     # Database migrations
│   └── package.json
│
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Text chat (non-streaming) |
| POST | `/api/chat/stream` | Text chat (streaming SSE) |
| POST | `/api/image/analyze` | Upload image for analysis |
| POST | `/api/image/ask` | Ask question about image |
| POST | `/api/pdf/upload` | Upload PDF → RAG indexing |
| POST | `/api/pdf/ask` | Ask question about PDF |
| GET | `/api/analytics` | Usage statistics |
| GET | `/api/health` | Health check |

## Supported Models

| Model | ID | Best For |
|-------|----|----------|
| Llama 3.3 70B | `llama-3.3-70b-versatile` | General text (default) |
| Mixtral 8x7B | `mixtral-8x7b-32768` | Fast responses, long context |
| Llama 4 Scout | `llama-4-scout-17b-16e-instruct` | Vision / image analysis |

## Browser Support

Voice features (STT/TTS) work best in **Chrome / Edge**. Firefox and Safari have partial support.

## License

MIT

## Live Demo

Check out the deployed app: [multimodel-chatbot.vercel.app](https://multimodel-chatbot.vercel.app/)