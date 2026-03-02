import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password) => {
        try {
            console.log('[Auth] signUp called for:', email);
            const { data, error } = await supabase.auth.signUp({ email, password });

            if (error) {
                console.error('[Auth] signUp error:', error.message, '| status:', error.status);
            } else {
                console.log('[Auth] signUp success:', data?.user?.id ?? 'no user id');
            }

            return { data, error };
        } catch (err) {
            console.error('[Auth] signUp unexpected error:', err);
            return {
                data: null,
                error: {
                    message: err.message === 'Failed to fetch'
                        ? 'Cannot connect to Supabase. Check your internet connection, or try a VPN / mobile hotspot.'
                        : `Unexpected error during sign up: ${err.message}`,
                },
            };
        }
    };

    const signIn = async (email, password) => {
        try {
            console.log('[Auth] signIn called for:', email);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                console.error('[Auth] signIn error:', error.message, '| status:', error.status);
            } else {
                console.log('[Auth] signIn success:', data?.user?.id ?? 'no user id');
            }

            return { data, error };
        } catch (err) {
            console.error('[Auth] signIn unexpected error:', err);
            return {
                data: null,
                error: {
                    message: err.message === 'Failed to fetch'
                        ? 'Cannot connect to Supabase. Check your internet connection, or try a VPN / mobile hotspot.'
                        : `Unexpected error during sign in: ${err.message}`,
                },
            };
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        return { error };
    };

    const value = { user, session, loading, signUp, signIn, signOut };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
