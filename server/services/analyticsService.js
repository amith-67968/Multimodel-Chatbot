/**
 * Analytics Service
 *
 * Tracks feature usage and response times, and provides aggregated
 * analytics by querying existing Supabase tables (messages,
 * conversation_metadata) plus the analytics_events table.
 */

const { getSupabaseAdmin } = require('./supabaseAdmin');

/**
 * Record a single analytics event (non-blocking, fire-and-forget).
 *
 * @param {string|null} userId  - User UUID (nullable for anonymous)
 * @param {string} feature      - One of 'text', 'voice', 'image', 'pdf'
 * @param {number} responseTimeMs - LLM response time in milliseconds
 * @param {string} [model]      - Model key used (e.g. 'llama3')
 */
async function trackEvent(userId, feature, responseTimeMs, model) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return; // Supabase not configured — silently skip

    try {
        await supabase.from('analytics_events').insert({
            user_id: userId || null,
            feature,
            response_time_ms: Math.round(responseTimeMs),
            model: model || null,
        });
    } catch (err) {
        // Analytics should never break the main flow
        console.error('[Analytics] Failed to track event:', err.message);
    }
}

/**
 * Get a full analytics summary for the admin dashboard.
 *
 * Returns:
 *  - totalConversations, totalMessages
 *  - featureBreakdown [{feature, count}]
 *  - avgResponseTimeMs
 *  - dailyMessages [{date, count}] (last 30 days)
 *  - dailyEvents [{date, count}] (last 30 days)
 *  - modelBreakdown [{model, count}]
 */
async function getAnalyticsSummary() {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
        return {
            totalConversations: 0,
            totalMessages: 0,
            featureBreakdown: [],
            avgResponseTimeMs: 0,
            dailyMessages: [],
            dailyEvents: [],
            modelBreakdown: [],
        };
    }

    // Run all queries in parallel for speed
    const [
        convResult,
        msgResult,
        featureResult,
        avgTimeResult,
        dailyMsgResult,
        modelResult,
    ] = await Promise.all([
        // Total conversations
        supabase
            .from('conversation_metadata')
            .select('*', { count: 'exact', head: true }),

        // Total messages
        supabase
            .from('messages')
            .select('*', { count: 'exact', head: true }),

        // Feature breakdown from analytics_events
        supabase.rpc('analytics_feature_breakdown'),

        // Average response time
        supabase.rpc('analytics_avg_response_time'),

        // Daily message counts (last 30 days)
        supabase.rpc('analytics_daily_messages'),

        // Model breakdown
        supabase.rpc('analytics_model_breakdown'),
    ]);

    return {
        totalConversations: convResult.count || 0,
        totalMessages: msgResult.count || 0,
        featureBreakdown: featureResult.data || [],
        avgResponseTimeMs: Math.round(avgTimeResult.data?.[0]?.avg_ms || 0),
        dailyMessages: dailyMsgResult.data || [],
        modelBreakdown: modelResult.data || [],
    };
}

module.exports = { trackEvent, getAnalyticsSummary };
