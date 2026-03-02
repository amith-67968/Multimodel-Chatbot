# Multimodel AI Chatbot

A full-stack multimodel AI chatbot that accepts **text, voice, image, and PDF** input and provides intelligent responses with **voice playback**.

![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Gemini](https://img.shields.io/badge/Google-Gemini%20API-orange)

## Features

- **Text Chat** – Conversational AI with memory
- **Voice Input** – Speak via microphone (Web Speech API)
- **Image Analysis** – Upload images for AI-powered analysis
- **PDF Document Q&A** – Upload PDFs, get summaries, ask follow-up questions
- **Voice Output** – Every AI response has a "Speak" button (TTS)
- **Beginner / Detailed mode** – Toggle explanation complexity
- **Dark / Light theme** – System-aware with manual toggle
- **Chat history sidebar** – Multiple conversations
- **Mobile responsive** – Works on all screen sizes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Backend | Node.js, Express |
| AI Model | Google Gemini 1.5 Flash |
| Voice | Web Speech API (STT + TTS) |
| File Processing | Multer, pdf-parse |

## Quick Start

### 1. Clone & configure

```bash
git clone <repo-url>
cd chatbot-antigravity
```

### 2. Set your Gemini API key

Edit `server/.env`:

```env
PORT=5000
GEMINI_API_KEY=your_actual_api_key_here
```

Get a free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 3. Install & start the backend

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:5000`

### 4. Install & start the frontend (new terminal)

```bash
cd client
npm install
npm run dev
```

App opens at `http://localhost:5173`

## Project Structure

```
chatbot-antigravity/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx    # Main chat interface
│   │   │   ├── MessageBubble.jsx # Styled message with TTS
│   │   │   ├── VoiceInput.jsx    # Microphone button (STT)
│   │   │   ├── ImageUpload.jsx   # Image upload button
│   │   │   └── FileUpload.jsx    # PDF upload button
│   │   ├── services/
│   │   │   └── api.js            # Axios API helpers
│   │   ├── utils/
│   │   │   └── speech.js         # TTS utility
│   │   ├── App.jsx               # App shell with sidebar
│   │   ├── main.jsx              # Entry point
│   │   └── index.css             # Global styles
│   └── package.json
│
├── server/                  # Express backend
│   ├── routes/
│   │   ├── chat.js               # POST /api/chat
│   │   ├── image.js              # POST /api/image
│   │   └── pdf.js                # POST /api/pdf/*
│   ├── services/
│   │   └── aiService.js          # Gemini API wrapper
│   ├── .env                      # API key config
│   └── package.json
│
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send text message with history |
| POST | `/api/image` | Upload image for analysis |
| POST | `/api/pdf/upload` | Upload PDF, get text + summary |
| POST | `/api/pdf/ask` | Ask question about uploaded PDF |
| GET | `/api/health` | Health check |

## Browser Support

Voice features (STT/TTS) work best in **Chrome / Edge**. Firefox and Safari have partial support.

## License

MIT
