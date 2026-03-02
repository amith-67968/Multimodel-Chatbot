import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { testSupabaseConnection } from '../lib/supabaseClient';

function friendlyError(raw) {
    if (!raw) return 'An unknown error occurred. Please try again.';
    const lower = raw.toLowerCase();
    if (lower.includes('failed to fetch'))
        return 'Cannot connect to Supabase. Your network may be blocking it — try a VPN or mobile hotspot.';
    if (lower.includes('user already registered') || lower.includes('already been registered'))
        return 'An account with this email already exists. Try signing in instead.';
    if (lower.includes('signup requires a valid password'))
        return 'Please enter a stronger password (at least 6 characters).';
    if (lower.includes('invalid api key') || lower.includes('invalid key'))
        return 'Authentication configuration error. Please contact the developer (invalid API key).';
    if (lower.includes('email signups are disabled'))
        return 'Email sign-ups are currently disabled. Please contact the administrator.';
    if (lower.includes('rate limit'))
        return 'Too many attempts. Please wait a minute and try again.';
    return raw;
}

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
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
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (typeof connStatus === 'string') {
            setError(connStatus);
            return;
        }

        setLoading(true);

        const { data, error: signUpError } = await signUp(email, password);

        if (signUpError) {
            console.error('[Register] signUp error object:', signUpError);
            setError(friendlyError(signUpError.message));
            setLoading(false);
        } else if (data?.user?.identities?.length === 0) {
            setError('An account with this email already exists. Try signing in instead.');
            setLoading(false);
        } else {
            setSuccess('Account created successfully! You can now sign in.');
            setLoading(false);
            setTimeout(() => navigate('/login'), 2000);
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
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create account</h1>
                    <p className="text-gray-500 text-sm mt-1">Start chatting with AI Assistant</p>
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

                        {success && (
                            <div className="px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                            <input
                                id="register-email"
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
                                id="register-password"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm Password</label>
                            <input
                                id="register-confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-surface-700 border border-white/8
                                    text-gray-200 placeholder-gray-600 text-sm
                                    focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20
                                    transition-all duration-200"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            id="register-submit"
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
                                    Creating account...
                                </span>
                            ) : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-white hover:underline font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
