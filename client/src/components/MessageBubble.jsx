import { useState } from 'react';
import { speak, stopSpeaking, isSpeaking } from '../utils/speech';
import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ message }) {
    const [speaking, setSpeaking] = useState(false);
    const isUser = message.role === 'user';

    const handleSpeak = () => {
        if (speaking) {
            stopSpeaking();
            setSpeaking(false);
        } else {
            setSpeaking(true);
            speak(message.content, () => setSpeaking(false));
        }
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[80%] lg:max-w-[70%]`}>
                {/* Avatar + Name */}
                <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${isUser
                            ? 'bg-surface-600 text-gray-200'
                            : 'bg-accent text-white'}`}>
                        {isUser ? 'U' : 'AI'}
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                        {isUser ? 'You' : 'Assistant'}
                    </span>
                </div>

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-surface-600 text-gray-100 rounded-tr-md'
                    : 'bg-surface-700 text-gray-200 rounded-tl-md'
                    }`}>
                    {/* Image preview */}
                    {message.imageUrl && (
                        <img
                            src={message.imageUrl}
                            alt="Uploaded"
                            className="rounded-lg mb-2 max-h-48 object-cover"
                        />
                    )}

                    {/* PDF badge */}
                    {message.pdfName && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {message.pdfName}
                        </div>
                    )}

                    {/* Content */}
                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <div className="prose-chat text-sm leading-relaxed">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Speak button for AI messages */}
                {!isUser && (
                    <div className="mt-1.5 flex items-center gap-2">
                        <button
                            onClick={handleSpeak}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all
                                ${speaking
                                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                    : 'bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10'}`}
                            title={speaking ? 'Stop speaking' : 'Speak answer'}
                        >
                            {speaking ? (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="4" width="4" height="16" rx="1" />
                                        <rect x="14" y="4" width="4" height="16" rx="1" />
                                    </svg>
                                    Stop
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.383 3.07C11.009 2.92 10.579 3.012 10.293 3.293L6.586 7H4a1 1 0 00-1 1v8a1 1 0 001 1h2.586l3.707 3.707A1 1 0 0012 20V4a1 1 0 00-.617-.93zM14.657 6.343a1 1 0 010 1.414A5.983 5.983 0 0013 12a5.984 5.984 0 001.657 4.243 1 1 0 01-1.414 1.414A7.975 7.975 0 0111 12c0-2.137.838-4.13 2.243-5.657a1 1 0 011.414 0zm3.536-2.828a1 1 0 010 1.414C16.214 6.908 15 9.358 15 12s1.214 5.092 3.193 7.071a1 1 0 01-1.414 1.414C14.43 18.136 13 15.218 13 12s1.43-6.136 3.779-8.485a1 1 0 011.414 0z" />
                                    </svg>
                                    Speak
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
