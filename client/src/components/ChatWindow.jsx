import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import VoiceInput from './VoiceInput';
import ImageUpload from './ImageUpload';
import FileUpload from './FileUpload';
import { sendMessage, analyzeImage, uploadPDF, askPDFQuestion } from '../services/api';

export default function ChatWindow({ mode, messages, setMessages, documentText, setDocumentText, onMessageSaved }) {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const buildHistory = () =>
        messages
            .filter((m) => !m.imageUrl && !m.pdfName)
            .map((m) => ({ role: m.role, content: m.content }));

    const handleSend = async (text = input.trim()) => {
        if (!text || loading) return;
        setInput('');

        const userMsg = { role: 'user', content: text, id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', text, 'text');
        setLoading(true);

        try {
            let reply;
            if (documentText) {
                reply = await askPDFQuestion(documentText, text, mode);
            } else {
                reply = await sendMessage(text, buildHistory(), mode);
            }
            setMessages((prev) => [...prev, { role: 'assistant', content: reply, id: Date.now() + 1 }]);
            onMessageSaved?.('assistant', reply, 'text');
        } catch (err) {
            const serverMsg = err.response?.data?.error;
            const errorText = serverMsg || 'Sorry, something went wrong. Please try again.';
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: `❌ ${errorText}`, id: Date.now() + 1 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleImage = async (file) => {
        if (loading) return;
        const imageUrl = URL.createObjectURL(file);
        const userMsg = { role: 'user', content: `Analyze this image: ${file.name}`, imageUrl, id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', `Analyze this image: ${file.name}`, 'image');
        setLoading(true);

        try {
            const data = await analyzeImage(file);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.reply, id: Date.now() + 1 },
            ]);
            onMessageSaved?.('assistant', data.reply, 'image');
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '❌ Failed to analyze image. Please try again.', id: Date.now() + 1 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handlePDF = async (file) => {
        if (loading) return;
        const userMsg = { role: 'user', content: `Uploaded PDF: ${file.name}`, pdfName: file.name, id: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        onMessageSaved?.('user', `Uploaded PDF: ${file.name}`, 'pdf');
        setLoading(true);

        try {
            const data = await uploadPDF(file, mode);
            setDocumentText(data.extractedText);
            const pdfReply = `📄 **${data.filename}** (${data.pages} page${data.pages !== 1 ? 's' : ''})\n\n**Summary:**\n${data.summary}\n\n_You can now ask questions about this document._`;
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: pdfReply, id: Date.now() + 1 },
            ]);
            onMessageSaved?.('assistant', pdfReply, 'pdf');
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '❌ Failed to process PDF. Please try again.', id: Date.now() + 1 },
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

    return (
        <div className="flex flex-col h-full bg-surface-800">
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

                {/* Typing indicator */}
                {loading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-surface-700 rounded-2xl rounded-tl-md px-5 py-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Document context indicator */}
            {documentText && (
                <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-white/5 border border-white/8 flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF loaded — questions will be answered from the document
                    </span>
                    <button
                        onClick={() => setDocumentText('')}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Input bar */}
            <div className="px-4 pb-4 pt-2">
                <div className="rounded-xl border border-white/10 bg-surface-700 p-2 flex items-end gap-2">
                    <div className="flex items-center gap-1">
                        <VoiceInput onTranscript={handleVoice} disabled={loading} />
                        <ImageUpload onImageSelect={handleImage} disabled={loading} />
                        <FileUpload onFileSelect={handlePDF} disabled={loading} />
                    </div>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={documentText ? 'Ask about the document...' : 'Message AI Assistant...'}
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none resize-none text-sm
                            text-gray-200 placeholder-gray-500
                            py-2.5 px-2 max-h-32"
                        disabled={loading}
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || loading}
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
                </div>
            </div>
        </div>
    );
}
