import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: log to console so user can verify env vars loaded
console.log('[Supabase] URL:', supabaseUrl ? supabaseUrl : '❌ MISSING');
console.log(
    '[Supabase] Key:',
    supabaseAnonKey
        ? `${supabaseAnonKey.slice(0, 20)}... (${supabaseAnonKey.startsWith('eyJ') ? 'valid JWT format' : '⚠️ does NOT look like a JWT'})`
        : '❌ MISSING'
);

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in client/.env ' +
        'and that you restarted the Vite dev server after changing them.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

/**
 * Test connectivity to Supabase. Returns { ok, message }.
 */
export async function testSupabaseConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
            signal: controller.signal,
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
            },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            return { ok: true, message: 'Supabase is reachable' };
        }

        // Try to extract a JSON error body for more context
        let detail = '';
        try {
            const body = await res.json();
            detail = body.message || body.error_description || body.msg || '';
        } catch (_) { /* ignore parse errors */ }

        return {
            ok: false,
            message: `Supabase responded with status ${res.status}${detail ? ': ' + detail : ''}. Check that your anon key is correct and not expired.`,
        };
    } catch (err) {
        if (err.name === 'AbortError') {
            return {
                ok: false,
                message: 'Connection to Supabase timed out. Your network may be blocking Supabase. Try using a VPN or mobile hotspot.',
            };
        }
        return {
            ok: false,
            message: `Cannot reach Supabase: ${err.message}. Check your internet connection or try a VPN.`,
        };
    }
}
