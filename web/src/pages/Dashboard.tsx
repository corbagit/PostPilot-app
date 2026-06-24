import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'

function getPlanLimits(tier: string) {
  if (tier === 'pro') return { postsPerMonth: 30, platforms: 3, platformNames: 'Instagram, LinkedIn, Twitter/X' }
  if (tier === 'starter') return { postsPerMonth: 10, platforms: 1, platformNames: '1 platform' }
  return { postsPerMonth: 3, platforms: 1, platformNames: '1 platform (Free)' }
}

export default function Dashboard() {
  const { user } = useAuth()
  const limits = getPlanLimits(user?.subscription_tier || 'free')
  const postsMade = user?.posts_generated || 0
  const postsRemaining = Math.max(limits.postsPerMonth - postsMade, 0)
  const usagePct = Math.min((postsMade / limits.postsPerMonth) * 100, 100)

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-white font-display">Welcome back, {user?.name || 'Creator'} 👋</h1>
              <p className="text-slate-400 text-sm mt-1">Here's your content overview</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-blue-400 font-display">{postsMade}</div>
                <div className="text-xs text-slate-500">Posts Made</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold text-emerald-400 font-display">{limits.postsPerMonth}</div>
                <div className="text-xs text-slate-500">Posts/Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Posts This Month</span>
              <span className="text-2xl">📝</span>
            </div>
            <div className="text-3xl font-extrabold text-white font-display">{postsMade}</div>
            <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {postsRemaining} remaining this month
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Active Platforms</span>
              <span className="text-2xl">📱</span>
            </div>
            <div className="text-3xl font-extrabold text-white font-display">{limits.platforms}</div>
            <p className="text-xs text-slate-500 mt-2">{limits.platformNames}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">Plan</span>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-3xl font-extrabold text-white font-display capitalize">{user?.subscription_tier || 'Free'}</div>
            <p className="text-xs text-slate-500 mt-2">
              {user?.subscription_status === 'active' ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        {/* Quick Action */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-xl font-bold text-white font-display mb-2">Ready to Create Content?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Drop in a raw idea and let PostPilot generate a week's worth of platform-optimized posts.
            </p>
            <Link
              to="/generate"
              className="inline-flex items-center px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
            >
              ✨ Generate Content
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}