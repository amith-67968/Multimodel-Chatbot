const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseAdmin = null;

/**
 * Get the Supabase admin client (lazy-initialized).
 * Returns null if credentials are not configured.
 */
function getSupabaseAdmin() {
    if (supabaseAdmin) return supabaseAdmin;

    if (!supabaseUrl || !supabaseServiceKey ||
        supabaseUrl === 'your-supabase-url-here' ||
        supabaseServiceKey === 'your-service-role-key-here') {
        console.warn('[Memory] Supabase credentials not configured — memory features disabled.');
        return null;
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    console.log('[Memory] Supabase admin client initialized.');
    return supabaseAdmin;
}

module.exports = { getSupabaseAdmin };
