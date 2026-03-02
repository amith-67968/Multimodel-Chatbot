import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import { useAuth } from '../context/AuthContext';
import { saveMessage, loadConversations, deleteConversation } from '../services/supabaseDb';

export default function Chat() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState('detailed');
    const [conversations, setConversations] = useState([{ id: String(Date.now()), title: 'New Chat', messages: [], documentText: '' }]);
    const [activeConvId, setActiveConvId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);

    // Load chat history from Supabase on mount — always start with a fresh chat
    useEffect(() => {
        if (!user) return;

        const load = async () => {
            const grouped = await loadConversations(user.id);
            const convIds = Object.keys(grouped);

            const freshId = String(Date.now());
            const freshConv = { id: freshId, title: 'New Chat', messages: [], documentText: '' };

            if (convIds.length > 0) {
                const loaded = convIds.map((convId) => {
                    const msgs = grouped[convId];
                    const firstUserMsg = msgs.find((m) => m.role === 'user');
                    const title = firstUserMsg ? firstUserMsg.content.slice(0, 36) : 'Chat';
                    return { id: convId, title, messages: msgs, documentText: '' };
                });
                setConversations([freshConv, ...loaded]);
            } else {
                setConversations([freshConv]);
            }
            setActiveConvId(freshId);
            setHistoryLoaded(true);
        };

        load();
    }, [user]);

    useEffect(() => {
        if (!activeConvId && conversations.length > 0) {
            setActiveConvId(conversations[0].id);
        }
    }, [conversations, activeConvId]);

    // Load voices early
    useEffect(() => {
        window.speechSynthesis?.getVoices();
    }, []);

    const activeConv = conversations.find((c) => c.id === activeConvId);

    const setMessages = (updater) => {
        setConversations((prev) =>
            prev.map((c) => {
                if (c.id !== activeConvId) return c;
                const newMsgs = typeof updater === 'function' ? updater(c.messages) : updater;
                const title = c.title === 'New Chat' && newMsgs.length > 0
                    ? newMsgs.find((m) => m.role === 'user')?.content.slice(0, 36) || 'New Chat'
                    : c.title;
                return { ...c, messages: newMsgs, title };
            })
        );
    };

    const setDocumentText = (text) => {
        setConversations((prev) =>
            prev.map((c) => (c.id === activeConvId ? { ...c, documentText: text } : c))
        );
    };

    const newChat = () => {
        const id = String(Date.now());
        setConversations((prev) => [...prev, { id, title: 'New Chat', messages: [], documentText: '' }]);
        setActiveConvId(id);
        setSidebarOpen(false);
    };

    const deleteConv = async (id) => {
        if (user) {
            await deleteConversation(user.id, id);
        }

        setConversations((prev) => {
            const filtered = prev.filter((c) => c.id !== id);
            if (filtered.length === 0) {
                const newConv = { id: String(Date.now()), title: 'New Chat', messages: [], documentText: '' };
                setActiveConvId(newConv.id);
                return [newConv];
            }
            if (activeConvId === id) setActiveConvId(filtered[0].id);
            return filtered;
        });
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleMessageSaved = async (role, content, inputType = 'text') => {
        if (!user || !activeConvId) return;
        await saveMessage(user.id, activeConvId, role, content, inputType);
    };

    if (!historyLoaded) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-700 flex items-center justify-center animate-pulse">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Loading conversations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-surface-900 text-gray-200">
            {/* ─── Sidebar ─── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col
                bg-surface-900 border-r border-white/5
                transform transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm text-white">AI Assistant</h1>
                            <p className="text-[10px] text-gray-500 tracking-wide uppercase">Multimodel Chat</p>
                        </div>
                    </div>
                </div>

                {/* New Chat button */}
                <div className="p-3">
                    <button
                        onClick={newChat}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
                            border border-white/10 text-sm text-gray-300
                            hover:bg-white/5 transition-all duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* Chat history */}
                <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150
                                ${conv.id === activeConvId
                                    ? 'bg-white/8 text-white'
                                    : 'hover:bg-white/4 text-gray-400'}`}
                            onClick={() => { setActiveConvId(conv.id); setSidebarOpen(false); }}
                        >
                            <svg className="w-4 h-4 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span className="flex-1 text-sm truncate">{conv.title}</span>
                            {conversations.length > 1 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteConv(conv.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bottom controls */}
                <div className="p-4 border-t border-white/5 space-y-3">
                    {/* Mode toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Explanation</span>
                        <div className="flex bg-surface-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setMode('beginner')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'beginner'
                                    ? 'bg-surface-700 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Beginner
                            </button>
                            <button
                                onClick={() => setMode('detailed')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'detailed'
                                    ? 'bg-surface-700 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                Detailed
                            </button>
                        </div>
                    </div>

                    {/* User info & Logout */}
                    <div className="pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <span className="text-xs text-gray-500 truncate flex-1">{user?.email}</span>
                        </div>
                        <button
                            id="logout-button"
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                                text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10
                                transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar (mobile) */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-surface-900">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="font-semibold text-sm text-white">AI Assistant</h1>
                </div>

                <ChatWindow
                    mode={mode}
                    messages={activeConv?.messages || []}
                    setMessages={setMessages}
                    documentText={activeConv?.documentText || ''}
                    setDocumentText={setDocumentText}
                    onMessageSaved={handleMessageSaved}
                />
            </main>
        </div>
    );
}
