import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import VoiceInput from './VoiceInput';
import ImageUpload from './ImageUpload';
import FileUpload from './FileUpload';
import { streamMessage, analyzeImage, askImageQuestion, uploadPDF, askPDFQuestion } from '../services/api';
import { speak, stopSpeaking } from '../utils/speech';

export default function ChatWindow({ mode, model, messages, setMessages, documentId, setDocumentId, onMessageSaved, userId, conversationId }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [imageContext, setImageContext] = useState(null);
    const [stagedImage, setStagedImage] = useState(null);
    const [dragActive, setDragActive] = useState(false);

    // Voice assistant mode
    const [voiceAssistant, setVoiceAssistant] = useState(false);
    const [vaListening, setVaListening] = useState(false);
    const [vaSpeaking, setVaSpeaking] = useState(false);
    const voiceAssistantRef = useRef(false);

    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    const streamingMsgIdRef = useRef(null);

    // Keep ref in sync
    useEffect(() => {
        voiceAssistantRef.current = voiceAssistant;
    }, [voiceAssistant]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clean up staged image object URL on unmount / change
    useEffect(() => {
        return () => {
            if (stagedImage?.previewUrl) URL.revokeObjectURL(stagedImage.previewUrl);
        };
    }, [stagedImage]);

    // Clean up voice assistant on unmount
    useEffect(() => {
        return () => {
            stopSpeaking();
        };
    }, []);

    const buildHistory = () =>
        messages
            .filter((m) => !m.imageUrl && !m.pdfName)
            .map((m) => ({ role: m.role, content: m.content }));

    const handleStopStreaming = () => {
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
    };

    /** Remove a staged image without uploading */
    const clearStagedImage = () => {
        if (stagedImage?.previewUrl) URL.revokeObjectURL(stagedImage.previewUrl);
        setStagedImage(null);
    };

    /** Auto-speak a response if voice assistant is active */
    const autoSpeak = useCallback((text) => {
        if (!voiceAssistantRef.current || !text) return;
        setVaSpeaking(true);
        speak(text, () => {
            setVaSpeaking(false);
            // Recognition auto-restarts via VoiceInput's onend handler
        });
    }, []);

    /** Upload & analyse the staged image */
    const sendStagedImage = async () => {
        if (!stagedImage) return;
        const { file, previewUrl } = stagedImage;
        setStagedImage(null);

        const userMsg = {
            role: 'user',
            content: `Analyze this image: ${file.name}`,
            imageUrl: previewUrl,
            imageName: file.name,
            id: Date.now(),
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', `Analyze this image: ${file.name}`, 'image');
        setLoading(true);

        try {
            const data = await analyzeImage(file);
            setImageContext({ imageData: data.imageData, mimeType: data.mimeType, previewUrl });
            const reply = data.reply;
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: reply, id: Date.now() + 1, timestamp: Date.now() },
            ]);
            onMessageSaved?.('assistant', reply, 'image');
            autoSpeak(reply);
        } catch (err) {
            const serverMsg = err.response?.data?.error || err.message;
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `❌ ${serverMsg || 'Failed to analyze image. Please try again.'}`, id: Date.now() + 1, timestamp: Date.now() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (text = input.trim()) => {
        if (stagedImage && !text) {
            await sendStagedImage();
            return;
        }

        if (!text && !stagedImage) return;
        if (loading) return;

        if (stagedImage) {
            await sendStagedImage();
            return;
        }

        setInput('');

        const userMsg = { role: 'user', content: text, id: Date.now(), timestamp: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', text, 'text');
        setLoading(true);

        try {
            if (imageContext) {
                const reply = await askImageQuestion(imageContext.imageData, imageContext.mimeType, text);
                setMessages((prev) => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1, timestamp: Date.now() }]);
                onMessageSaved?.('assistant', reply, 'image');
                autoSpeak(reply);
            } else if (documentId) {
                const reply = await askPDFQuestion(documentId, userId, text, mode);
                setMessages((prev) => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1, timestamp: Date.now() }]);
                onMessageSaved?.('assistant', reply, 'text');
                autoSpeak(reply);
            } else {
                // Text chat – use streaming
                const assistantMsgId = Date.now() + 1;
                streamingMsgIdRef.current = assistantMsgId;

                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '', id: assistantMsgId, isStreaming: true, timestamp: Date.now() },
                ]);
                setIsStreaming(true);

                const controller = new AbortController();
                abortControllerRef.current = controller;

                let fullContent = '';

                await streamMessage(text, buildHistory(), mode, {
                    userId,
                    conversationId,
                    model,
                    onChunk: (token) => {
                        fullContent += token;
                        const updatedContent = fullContent;
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? { ...m, content: updatedContent }
                                    : m
                            )
                        );
                    },
                    onDone: () => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? { ...m, isStreaming: false }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                        abortControllerRef.current = null;
                        streamingMsgIdRef.current = null;
                        if (fullContent) {
                            onMessageSaved?.('assistant', fullContent, 'text');
                            autoSpeak(fullContent);
                        }
                    },
                    onError: (errorMsg) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === assistantMsgId
                                    ? { ...m, content: `❌ ${errorMsg}`, isStreaming: false }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                        abortControllerRef.current = null;
                        streamingMsgIdRef.current = null;
                    },
                    signal: controller.signal,
                });
            }
        } catch (err) {
            const serverMsg = err.response?.data?.error || err.message;
            const errorText = serverMsg || 'Sorry, something went wrong. Please try again.';
            if (!streamingMsgIdRef.current) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: `❌ ${errorText}`, id: Date.now() + 1, timestamp: Date.now() },
                ]);
            } else {
                const msgId = streamingMsgIdRef.current;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === msgId
                            ? { ...m, content: `❌ ${errorText}`, isStreaming: false }
                            : m
                    )
                );
            }
            setIsStreaming(false);
            abortControllerRef.current = null;
            streamingMsgIdRef.current = null;
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelect = (file) => {
        if (loading) return;
        const previewUrl = URL.createObjectURL(file);
        setStagedImage({ file, previewUrl });
    };

    const handlePDF = async (file) => {
        if (loading) return;
        const userMsg = { role: 'user', content: `Uploaded PDF: ${file.name}`, pdfName: file.name, id: Date.now(), timestamp: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', `Uploaded PDF: ${file.name}`, 'pdf');
        setLoading(true);

        try {
            const data = await uploadPDF(file, mode, userId);
            setDocumentId(data.documentId);
            const pdfReply = `📄 **${data.filename}** (${data.pages} page${data.pages !== 1 ? 's' : ''}, ${data.chunkCount} chunks indexed)\n\n**Summary:**\n${data.summary}\n\n_You can now ask questions about this document._`;
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: pdfReply, id: Date.now() + 1, timestamp: Date.now() },
            ]);
            onMessageSaved?.('assistant', pdfReply, 'pdf');
            autoSpeak(pdfReply);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '❌ Failed to process PDF. Please try again.', id: Date.now() + 1, timestamp: Date.now() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleVoice = (transcript) => {
        handleSend(transcript);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleVoiceAssistant = () => {
        const next = !voiceAssistant;
        if (!next) {
            // Turning off — stop TTS and recognition
            stopSpeaking();
            setVaSpeaking(false);
            setVaListening(false);
        }
        setVoiceAssistant(next);
    };

    // Derive VA status label
    const vaStatus = voiceAssistant
        ? vaSpeaking
            ? 'Speaking…'
            : vaListening
                ? 'Listening…'
                : loading
                    ? 'Thinking…'
                    : 'Ready'
        : null;

    // ── Drag-and-drop handlers ──
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        if (file.type === 'application/pdf') {
            handlePDF(file);
        } else if (file.type.startsWith('image/')) {
            handleImageSelect(file);
        }
    };

    return (
        <div
            className={`flex flex-col h-full bg-surface-800 relative ${dragActive ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag-and-drop overlay */}
            {dragActive && (
                <div className="drop-overlay">
                    <div className="drop-overlay-content">
                        <svg className="w-12 h-12 text-accent mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-white font-semibold">Drop image or PDF here</p>
                        <p className="text-gray-400 text-sm mt-1">Supports images and PDF files</p>
                    </div>
                </div>
            )}
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Multimodel AI Assistant</h2>
                        <p className="text-gray-500 max-w-md text-sm leading-relaxed">
                            Ask me anything via text or voice. Upload images for analysis or PDFs for document Q&A.
                            Every response can be spoken aloud.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 max-w-lg">
                            {[
                                { icon: '💬', label: 'Text Chat' },
                                { icon: '🎤', label: 'Voice Input' },
                                { icon: '🖼️', label: 'Image Analysis' },
                                { icon: '📄', label: 'PDF Q&A' },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl px-3 py-3 text-center border border-white/8 bg-white/3 hover:bg-white/6 transition-colors cursor-default">
                                    <span className="text-2xl block mb-1">{item.icon}</span>
                                    <span className="text-xs text-gray-500">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {/* Enhanced typing indicator */}
                {loading && !isStreaming && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-white">
                                AI
                            </div>
                            <div className="bg-surface-700 rounded-2xl rounded-tl-md px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                                    </div>
                                    <span className="text-xs text-gray-500 shimmer-text">AI is thinking...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice Assistant status bar */}
            {voiceAssistant && (
                <div className="voice-assistant-bar mx-4 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`va-dot ${vaSpeaking ? 'va-dot-speaking' : vaListening ? 'va-dot-listening' : ''}`} />
                        <span className="text-xs font-medium text-gray-300">
                            🎙️ Voice Assistant — {vaStatus}
                        </span>
                    </div>
                    <button
                        onClick={toggleVoiceAssistant}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Image context indicator (with thumbnail) */}
            {imageContext && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-2">
                        {imageContext.previewUrl ? (
                            <img
                                src={imageContext.previewUrl}
                                alt="Context"
                                className="w-6 h-6 rounded object-cover"
                            />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        )}
                        Image loaded — questions will be about this image
                    </span>
                    <button
                        onClick={() => setImageContext(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Document context indicator */}
            {documentId && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF indexed — questions will use RAG retrieval
                    </span>
                    <button
                        onClick={() => setDocumentId('')}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Staged image preview strip */}
            {stagedImage && (
                <div className="mx-4 mb-2 image-preview-strip">
                    <img src={stagedImage.previewUrl} alt="Preview" />
                    <span className="text-xs text-gray-400 truncate max-w-[200px]">
                        {stagedImage.file.name}
                    </span>
                    <button className="remove-btn" onClick={clearStagedImage} title="Remove image">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2">
                <div className="rounded-xl border border-white/10 bg-surface-700 p-2 flex items-end gap-2">
                    <div className="flex items-center gap-1">
                        <VoiceInput
                            onTranscript={handleVoice}
                            disabled={loading}
                            assistantMode={voiceAssistant}
                            onListeningChange={setVaListening}
                        />
                        {/* Voice Assistant toggle button */}
                        <button
                            onClick={toggleVoiceAssistant}
                            className={`p-2.5 rounded-lg transition-all duration-200
                                ${voiceAssistant
                                    ? 'bg-accent text-white voice-ring'
                                    : 'bg-surface-800 text-gray-500 hover:bg-surface-600 hover:text-gray-300'
                                }
                                disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={voiceAssistant ? 'Stop voice assistant' : 'Start voice assistant'}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.536 8.464a5 5 0 010 7.072M12 6a6 6 0 000 12m6.364-2.636A9 9 0 006.636 6.636M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </button>
                        <ImageUpload onImageSelect={handleImageSelect} disabled={loading} />
                        <FileUpload onFileSelect={handlePDF} disabled={loading} />
                    </div>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            voiceAssistant
                                ? 'Voice assistant active — or type here...'
                                : stagedImage
                                    ? 'Press Enter to analyze, or type a question...'
                                    : imageContext
                                        ? 'Ask about the image...'
                                        : documentId
                                            ? 'Ask about the document...'
                                            : 'Message AI Assistant...'
                        }
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm
                            text-gray-200 placeholder-gray-500
                            py-2.5 px-2 max-h-32"
                        disabled={loading}
                    />

                    {isStreaming ? (
                        <button
                            onClick={handleStopStreaming}
                            className="p-2.5 rounded-lg bg-red-500/20 text-red-400
                                hover:bg-red-500/30 transition-all duration-200"
                            title="Stop generating"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() && !stagedImage || loading}
                            className="p-2.5 rounded-lg bg-white text-surface-900
                                hover:bg-gray-200 transition-all duration-200
                                disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Send message"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
