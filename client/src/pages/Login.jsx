import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testSupabaseConnection } from '../lib/supabaseClient';

function friendlyError(raw) {
    if (!raw) return 'An unknown error occurred. Please try again.';
    const lower = raw.toLowerCase();
    if (lower.includes('failed to fetch'))
        return 'Cannot connect to Supabase. Your network may be blocking it — try a VPN or mobile hotspot.';
    if (lower.includes('invalid login credentials'))
        return 'Incorrect email or password. Please try again.';
    if (lower.includes('invalid api key') || lower.includes('invalid key'))
        return 'Authentication configuration error. Please contact the developer (invalid API key).';
    if (lower.includes('email not confirmed'))
        return 'Please check your email and confirm your account before signing in.';
    if (lower.includes('rate limit'))
        return 'Too many attempts. Please wait a minute and try again.';
    return raw;
}

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [connStatus, setConnStatus] = useState(null);

    useEffect(() => {
        testSupabaseConnection().then(({ ok, message }) => {
            setConnStatus(ok ? true : message);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (typeof connStatus === 'string') {
            setError(connStatus);
            return;
        }

        setLoading(true);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            console.error('[Login] signIn error object:', signInError);
            setError(friendlyError(signInError.message));
            setLoading(false);
        } else {
            navigate('/chat');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome back</h1>
                    <p className="text-gray-500 text-sm mt-1">Sign in to your AI Assistant</p>
                </div>

                {/* Form */}
                <div className="rounded-xl border border-white/8 bg-surface-800 p-6">
                    {connStatus === null && (
                        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/8 text-gray-400 text-sm flex items-center gap-2 mb-4">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Checking connectivity...
                        </div>
                    )}
                    {typeof connStatus === 'string' && (
                        <div className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-4">
                            ⚠️ {connStatus}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-white/8
                                    text-gray-200 placeholder-gray-600 text-sm
                                    focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20
                                    transition-all duration-200"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                            <input
                                id="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-white/8
                                    text-gray-200 placeholder-gray-600 text-sm
                                    focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20
                                    transition-all duration-200"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-accent text-white font-medium text-sm
                                border border-white/20
                                hover:bg-accent-hover transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-white hover:underline font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
