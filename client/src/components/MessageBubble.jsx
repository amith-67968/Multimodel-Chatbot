import { useState, useMemo } from 'react';
import { speak, stopSpeaking } from '../utils/speech';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/** Format a timestamp into a relative string */
function formatTime(ts) {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function MessageBubble({ message }) {
    const [speaking, setSpeaking] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;

    const handleSpeak = () => {
        if (speaking) {
            stopSpeaking();
            setSpeaking(false);
        } else {
            setSpeaking(true);
            speak(message.content, () => setSpeaking(false));
        }
    };

    const handleCopyMessage = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    const imageTypeLabel = (() => {
        if (!message.imageUrl) return null;
        const name = message.imageName || 'image';
        return name.split('.').pop()?.toUpperCase() || 'IMG';
    })();

    /** Custom renderers for ReactMarkdown — syntax-highlighted code blocks */
    /** Markdown renderers — use lightweight plain blocks while streaming,
     *  switch to full Prism highlighting once the message is complete. */
    const markdownComponents = useMemo(() => ({
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
                const lang = match?.[1] || 'text';

                // While streaming, skip expensive syntax highlighting
                if (isStreaming) {
                    return (
                        <div className="code-block-wrapper">
                            <div className="code-block-header">
                                <span className="code-block-lang">{lang}</span>
                            </div>
                            <pre style={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '0.825rem', background: 'rgba(0,0,0,0.45)', padding: '0.75rem', overflowX: 'auto' }}>
                                <code>{codeString}</code>
                            </pre>
                        </div>
                    );
                }

                return (
                    <div className="code-block-wrapper">
                        <div className="code-block-header">
                            <span className="code-block-lang">{lang}</span>
                            <button
                                className="code-copy-btn"
                                onClick={async () => {
                                    await navigator.clipboard.writeText(codeString);
                                    const btn = document.activeElement;
                                    if (btn) {
                                        btn.textContent = '✓ Copied';
                                        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
                                    }
                                }}
                            >
                                Copy
                            </button>
                        </div>
                        <SyntaxHighlighter
                            style={oneDark}
                            language={lang}
                            PreTag="div"
                            customStyle={{
                                margin: 0,
                                borderRadius: '0 0 8px 8px',
                                fontSize: '0.825rem',
                                background: 'rgba(0,0,0,0.45)',
                            }}
                            {...props}
                        >
                            {codeString}
                        </SyntaxHighlighter>
                    </div>
                );
            }
            // Inline code
            return <code className={className} {...props}>{children}</code>;
        },
    }), [isStreaming]);

    return (
        <>
            {/* Lightbox overlay */}
            {expanded && message.imageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm lightbox-enter cursor-pointer"
                    onClick={() => setExpanded(false)}
                >
                    <img
                        src={message.imageUrl}
                        alt="Expanded preview"
                        className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <span className="absolute top-6 right-6 px-3 py-1 rounded-lg text-xs
                        bg-black/60 text-white/80 backdrop-blur-sm">
                        Click anywhere to close
                    </span>
                </div>
            )}

            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-[80%] lg:max-w-[70%]`}>
                    {/* Avatar + Name + Timestamp */}
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
                        {message.timestamp && (
                            <span className="text-[10px] text-gray-600 ml-1">
                                {formatTime(message.timestamp)}
                            </span>
                        )}
                    </div>

                    {/* Bubble */}
                    <div className={`rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-surface-600 text-gray-100 rounded-tr-md'
                        : 'bg-surface-700 text-gray-200 rounded-tl-md'
                        }`}>
                        {/* Image preview */}
                        {message.imageUrl && (
                            <div className="relative mb-2 group">
                                <img
                                    src={message.imageUrl}
                                    alt="Uploaded"
                                    className="rounded-lg max-h-48 object-cover cursor-pointer
                                        hover:brightness-90 transition-all duration-200"
                                    onClick={() => setExpanded(true)}
                                />
                                {imageTypeLabel && (
                                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px]
                                        font-semibold bg-black/60 text-white/90 backdrop-blur-sm">
                                        {imageTypeLabel}
                                    </span>
                                )}
                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px]
                                    bg-black/60 text-white/80 opacity-0 group-hover:opacity-100
                                    transition-opacity duration-200 backdrop-blur-sm">
                                    Click to expand
                                </span>
                                {message.imageName && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {message.imageName}
                                    </div>
                                )}
                            </div>
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
                                <ReactMarkdown components={markdownComponents}>
                                    {message.content}
                                </ReactMarkdown>
                                {isStreaming && (
                                    <span className="streaming-cursor">▊</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action buttons for AI messages */}
                    {!isUser && !isStreaming && message.content && (
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
                            <button
                                onClick={handleCopyMessage}
                                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full
                                    bg-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-all"
                                title="Copy response"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
