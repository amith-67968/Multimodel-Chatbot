import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
    const { user } = useAuth();

    return (
        <div className="landing-page">
            <div className="landing-bg" />

            <div className="landing-particles">
                {[...Array(20)].map((_, i) => (
                    <span key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 6}s`,
                        animationDuration: `${3 + Math.random() * 4}s`,
                        width: `${2 + Math.random() * 4}px`,
                        height: `${2 + Math.random() * 4}px`,
                    }} />
                ))}
            </div>

            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <span className="text-lg font-bold text-white">AI Assistant</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <Link to="/chat" className="landing-btn-primary">
                                Open Chat →
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="landing-btn-ghost">Sign In</Link>
                                <Link to="/register" className="landing-btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-badge">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        Powered by Advanced AI
                    </span>
                </div>

                <h1 className="landing-title">
                    Your Intelligent
                    <br />
                    <span className="gradient-text">Multimodel AI</span>
                    <br />
                    Assistant
                </h1>

                <p className="landing-subtitle">
                    Chat via text or voice. Upload images for instant analysis.
                    <br className="hidden sm:block" />
                    Drop PDFs for deep document Q&A. Every response spoken aloud.
                </p>

                <div className="landing-cta">
                    {user ? (
                        <Link to="/chat" className="landing-btn-hero">
                            Open Chat
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    ) : (
                        <>
                            <Link to="/register" className="landing-btn-hero">
                                Start Free
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>
                            <Link to="/login" className="landing-btn-outline">
                                Sign In
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <div className="landing-features-grid">
                    {[
                        { icon: '💬', title: 'Text Chat', desc: 'Natural conversations powered by cutting-edge language models.' },
                        { icon: '🎤', title: 'Voice Input', desc: 'Speak your queries — instant speech-to-text transcription.' },
                        { icon: '🖼️', title: 'Image Analysis', desc: 'Upload any image for detailed AI-powered visual analysis.' },
                        { icon: '📄', title: 'PDF Q&A', desc: 'Drop documents and ask questions — AI reads them for you.' },
                        { icon: '🔊', title: 'Voice Responses', desc: 'Every answer can be spoken aloud with natural voices.' },
                        { icon: '🔒', title: 'Secure Auth', desc: 'Your data stays private with Supabase authentication.' },
                    ].map((f) => (
                        <div key={f.title} className="feature-card">
                            <div className="feature-icon">{f.icon}</div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Bottom CTA */}
            <section className="landing-bottom-cta">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                    Ready to experience the future?
                </h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto text-sm sm:text-base">
                    Join now and unlock the power of multimodel AI — text, voice, vision, and documents all in one place.
                </p>
                {user ? (
                    <Link to="/chat" className="landing-btn-hero">Open Chat →</Link>
                ) : (
                    <Link to="/register" className="landing-btn-hero">Create Free Account →</Link>
                )}
            </section>

            <footer className="landing-footer">
                <p className="text-gray-600 text-xs">
                    © 2026 AI Assistant · Built with React & Supabase
                </p>
            </footer>
        </div>
    );
}
