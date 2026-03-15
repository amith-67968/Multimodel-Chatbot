import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/analytics`);
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-700 flex items-center justify-center animate-pulse">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-surface-900">
                <div className="text-center">
                    <p className="text-red-400 mb-4">❌ {error}</p>
                    <button onClick={() => navigate('/chat')} className="text-sm text-gray-400 hover:text-white">
                        ← Back to Chat
                    </button>
                </div>
            </div>
        );
    }

    const { totalConversations, totalMessages, featureBreakdown, avgResponseTimeMs, dailyMessages, modelBreakdown } = data;

    // Feature chart max value for scaling bars
    const maxFeatureCount = Math.max(1, ...featureBreakdown.map(f => Number(f.count)));
    const featureColors = { text: '#10b981', voice: '#3b82f6', image: '#f59e0b', pdf: '#ef4444' };
    const featureIcons = { text: '💬', voice: '🎤', image: '🖼️', pdf: '📄' };

    // Daily messages chart
    const maxDailyCount = Math.max(1, ...dailyMessages.map(d => Number(d.count)));

    // Build SVG polyline points for daily messages
    const chartWidth = 600;
    const chartHeight = 200;
    const dailyPoints = dailyMessages.map((d, i) => {
        const x = (i / Math.max(1, dailyMessages.length - 1)) * chartWidth;
        const y = chartHeight - (Number(d.count) / maxDailyCount) * (chartHeight - 20);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="min-h-screen bg-surface-900 text-gray-200">
            {/* Header */}
            <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/chat')}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold text-white">Analytics Dashboard</h1>
                </div>
                <span className="text-xs text-gray-500">{user?.email}</span>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Conversations" value={totalConversations} icon="💬" color="#10b981" />
                    <StatCard label="Total Messages" value={totalMessages} icon="📨" color="#3b82f6" />
                    <StatCard label="Avg Response Time" value={`${avgResponseTimeMs}ms`} icon="⚡" color="#f59e0b" />
                    <StatCard label="Features Used" value={featureBreakdown.length} icon="🧩" color="#8b5cf6" />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Feature Usage Chart */}
                    <div className="dashboard-card">
                        <h3 className="text-sm font-semibold text-white mb-4">Feature Usage</h3>
                        <div className="space-y-3">
                            {featureBreakdown.length === 0 ? (
                                <p className="text-xs text-gray-500">No data yet</p>
                            ) : (
                                featureBreakdown.map(f => (
                                    <div key={f.feature} className="flex items-center gap-3">
                                        <span className="text-lg w-7">{featureIcons[f.feature] || '❓'}</span>
                                        <span className="text-xs text-gray-400 w-12 capitalize">{f.feature}</span>
                                        <div className="flex-1 bg-surface-800 rounded-full h-5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(Number(f.count) / maxFeatureCount) * 100}%`,
                                                    backgroundColor: featureColors[f.feature] || '#6b7280',
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 w-10 text-right">{f.count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Model Usage Chart */}
                    <div className="dashboard-card">
                        <h3 className="text-sm font-semibold text-white mb-4">Model Usage</h3>
                        <div className="space-y-3">
                            {modelBreakdown.length === 0 ? (
                                <p className="text-xs text-gray-500">No data yet</p>
                            ) : (
                                modelBreakdown.map(m => {
                                    const maxModelCount = Math.max(1, ...modelBreakdown.map(x => Number(x.count)));
                                    return (
                                        <div key={m.model} className="flex items-center gap-3">
                                            <span className="text-lg w-7">🤖</span>
                                            <span className="text-xs text-gray-400 w-20 truncate">{m.model}</span>
                                            <div className="flex-1 bg-surface-800 rounded-full h-5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500 bg-accent"
                                                    style={{
                                                        width: `${(Number(m.count) / maxModelCount) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-400 w-10 text-right">{m.count}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Daily Messages Line Chart */}
                <div className="dashboard-card">
                    <h3 className="text-sm font-semibold text-white mb-4">Daily Messages (Last 30 Days)</h3>
                    {dailyMessages.length === 0 ? (
                        <p className="text-xs text-gray-500">No data yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <svg viewBox={`-30 -10 ${chartWidth + 40} ${chartHeight + 40}`} className="w-full h-52">
                                {/* Grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                                    const y = chartHeight - frac * (chartHeight - 20);
                                    const label = Math.round(frac * maxDailyCount);
                                    return (
                                        <g key={frac}>
                                            <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(255,255,255,0.06)" />
                                            <text x="-8" y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end">{label}</text>
                                        </g>
                                    );
                                })}
                                {/* Area fill */}
                                <polygon
                                    points={`0,${chartHeight} ${dailyPoints} ${chartWidth},${chartHeight}`}
                                    fill="url(#areaGradient)"
                                />
                                {/* Line */}
                                <polyline
                                    points={dailyPoints}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Dots */}
                                {dailyMessages.map((d, i) => {
                                    const x = (i / Math.max(1, dailyMessages.length - 1)) * chartWidth;
                                    const y = chartHeight - (Number(d.count) / maxDailyCount) * (chartHeight - 20);
                                    return <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />;
                                })}
                                {/* X-axis labels (every 7 days) */}
                                {dailyMessages.filter((_, i) => i % 7 === 0).map((d, _, arr) => {
                                    const origIdx = dailyMessages.indexOf(d);
                                    const x = (origIdx / Math.max(1, dailyMessages.length - 1)) * chartWidth;
                                    const label = new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    return (
                                        <text key={d.date} x={x} y={chartHeight + 18} fill="#6b7280" fontSize="9" textAnchor="middle">
                                            {label}
                                        </text>
                                    );
                                })}
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="dashboard-card flex items-center gap-4">
            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${color}15` }}
            >
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
            </div>
        </div>
    );
}
