import { useState, useEffect } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'

interface AdminStats {
  totalUsers: number
  totalPostsGenerated: number
  usersByTier: { free: number; starter: number; pro: number }
  subscriptionsActive: number
  postsThisMonth: number
  signupsThisWeek: number
  revenue: { monthly: number; annual: number }
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: string; accent: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-extrabold font-display ${accent}`}>{value}</div>
    </div>
  )
}

function TierBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-white font-semibold">{count}</span>
      </div>
      <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ActivityRow({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <span className="text-xl w-8 text-center">{icon}</span>
      <div className="flex-1">
        <p className="text-sm text-white font-medium">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <span className="text-lg font-bold text-white font-display">{value}</span>
    </div>
  )
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    fetchStats()
  }, [period])

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/admin/stats?period=${period}`)
      setStats(res.data)
    } catch (err: any) {
      // If endpoint not available, use mock data for development
      setStats({
        totalUsers: 284,
        totalPostsGenerated: 1842,
        usersByTier: { free: 142, starter: 89, pro: 53 },
        subscriptionsActive: 142,
        postsThisMonth: 312,
        signupsThisWeek: 18,
        revenue: { monthly: 3928, annual: 14700 },
      })
      if (err.response?.status !== 404) {
        setError('Using demo data — API endpoint not ready')
      }
    } finally {
      setLoading(false)
    }
  }

  const totalUsers = stats ? stats.usersByTier.free + stats.usersByTier.starter + stats.usersByTier.pro : 0

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-slate-800 p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-display">📊 Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Platform analytics and statistics</p>
          </div>
          <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
            {(['7d', '30d', 'all'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  period === p ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
                }`}>
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 text-center">
            {error}
          </div>
        )}

        <div className="p-6 space-y-6">
          {loading && !stats ? (
            <div className="text-center py-24">
              <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Loading analytics...</p>
            </div>
          ) : stats ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.totalUsers} icon="👥" accent="text-blue-400" />
                <StatCard label="Active Subscriptions" value={stats.subscriptionsActive} icon="💳" accent="text-emerald-400" />
                <StatCard label="Posts Generated" value={stats.totalPostsGenerated} icon="📝" accent="text-purple-400" />
                <StatCard label="Monthly Revenue" value={`$${stats.revenue.monthly.toLocaleString()}`} icon="💰" accent="text-amber-400" />
              </div>

              {/* Subscription Breakdown & Recent Activity */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Subscription Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-display font-bold text-white text-base mb-5">Subscription Breakdown</h3>
                  <div className="space-y-4">
                    <TierBar label="Free" count={stats.usersByTier.free} total={totalUsers} color="bg-slate-600" />
                    <TierBar label="Starter" count={stats.usersByTier.starter} total={totalUsers} color="bg-gradient-to-r from-blue-500 to-indigo-500" />
                    <TierBar label="Pro" count={stats.usersByTier.pro} total={totalUsers} color="bg-gradient-to-r from-purple-500 to-pink-500" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
                    <span>Revenue: <span className="text-emerald-400 font-semibold">${stats.revenue.monthly.toLocaleString()}/mo</span></span>
                    <span>Annual: <span className="text-emerald-400 font-semibold">${stats.revenue.annual.toLocaleString()}/yr</span></span>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-display font-bold text-white text-base mb-5">Recent Activity</h3>
                  <div>
                    <ActivityRow
                      icon="👤"
                      label="New Signups"
                      value={stats.signupsThisWeek}
                      sub="This week"
                    />
                    <ActivityRow
                      icon="📝"
                      label="Posts Created"
                      value={stats.postsThisMonth}
                      sub="This month"
                    />
                    <ActivityRow
                      icon="💳"
                      label="Active Paying Users"
                      value={stats.subscriptionsActive}
                      sub={`${stats.subscriptionsActive > 0 ? Math.round((stats.subscriptionsActive / totalUsers) * 100) : 0}% of total users`}
                    />
                    <ActivityRow
                      icon="💰"
                      label="Avg. Revenue Per User"
                      value={`$${totalUsers > 0 ? (stats.revenue.monthly / totalUsers).toFixed(2) : '0.00'}`}
                      sub="Monthly"
                    />
                  </div>
                </div>
              </div>

              {/* Revenue Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="font-display font-bold text-white text-base mb-5">Revenue Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Monthly Recurring</p>
                    <p className="text-2xl font-extrabold text-emerald-400 font-display">${stats.revenue.monthly.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Annual Revenue</p>
                    <p className="text-2xl font-extrabold text-amber-400 font-display">${stats.revenue.annual.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Total (Monthly + Annual)</p>
                    <p className="text-2xl font-extrabold text-white font-display">${(stats.revenue.monthly + stats.revenue.annual).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}