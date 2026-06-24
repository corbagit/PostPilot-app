import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Sidebar from '../components/Sidebar'
import PayPalButton from '../components/PayPalButton'
import api from '../api/client'

function getPlanLimits(tier: string) {
  if (tier === 'pro') return { name: 'Pro', price: '$59', postsPerMonth: 30, platforms: 3 }
  if (tier === 'starter') return { name: 'Starter', price: '$29', postsPerMonth: 10, platforms: 1 }
  return { name: 'Free', price: '$0', postsPerMonth: 3, platforms: 1 }
}

// TODO: Replace with real data from GET /api/billing/subscription when available
// For now we infer payment method from user state and mock
const MOCK_PAYMENT_METHOD = 'stripe' // 'stripe' | 'paypal'
const MOCK_PAYPAL_EMAIL = 'user@paypal.com'
const MOCK_NEXT_BILLING = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
})

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const plan = getPlanLimits(user?.subscription_tier || 'free')
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [paypalMsg, setPaypalMsg] = useState('')
  const [showPaypal, setShowPaypal] = useState(false)

  // Determine current payment method (mock — will come from API)
  const paymentMethod = user?.subscription_tier === 'free' ? null : MOCK_PAYMENT_METHOD

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.put('/auth/profile', { name })
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const postsMade = user?.posts_generated || 0
  const usagePct = Math.min((postsMade / plan.postsPerMonth) * 100, 100)
  const nextReset = new Date()
  nextReset.setMonth(nextReset.getMonth() + 1, 1)

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-2xl font-extrabold text-white font-display">⚙️ Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account and subscription</p>
        </div>

        <div className="p-6 max-w-2xl space-y-8">
          {/* Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-display font-bold text-white text-base mb-5">Profile</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email</label>
                <input type="email" value={user?.email || ''} disabled
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-400 text-sm cursor-not-allowed" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer">
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Subscription */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-display font-bold text-white text-base mb-5">Subscription</h3>

            {/* Plan info */}
            <div className="flex items-center justify-between mb-4 p-4 bg-slate-800 rounded-lg">
              <div>
                <p className="text-white font-semibold">{plan.name} Plan</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {plan.price}/month · {plan.postsPerMonth} posts/month · {plan.platforms} platform{plan.platforms > 1 ? 's' : ''}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                user?.subscription_status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {user?.subscription_status === 'active' ? 'Active' : user?.subscription_status || 'Inactive'}
              </span>
            </div>

            {/* Payment Method Display */}
            <div className="mb-4 p-4 bg-slate-800/50 rounded-lg space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Method</h4>

              {paymentMethod ? (
                <div className="flex items-center gap-3">
                  {paymentMethod === 'stripe' ? (
                    <>
                      <span className="text-lg">🔵</span>
                      <div>
                        <p className="text-sm text-white font-medium">Stripe</p>
                        <p className="text-xs text-slate-500">Credit / Debit Card</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">🅿️</span>
                      <div>
                        <p className="text-sm text-white font-medium">PayPal</p>
                        <p className="text-xs text-slate-500">{MOCK_PAYPAL_EMAIL}</p>
                      </div>
                    </>
                  )}
                  <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No payment method set</p>
              )}

              {/* Next billing date */}
              {paymentMethod && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50 mt-2">
                  <span>📅</span>
                  <span>Next billing: <span className="text-white font-medium">{MOCK_NEXT_BILLING}</span></span>
                </div>
              )}
            </div>

            {/* Plan actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              <a
                href={`/api/billing/create-checkout-session?tier=${user?.subscription_tier === 'pro' ? 'starter' : 'pro'}`}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all inline-block"
              >
                {user?.subscription_tier === 'pro' ? 'Downgrade to Starter' : 'Upgrade to Pro'}
              </a>
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer">
                Cancel Subscription
              </button>
            </div>

            {/* Change Payment Method */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Change Payment Method</h4>

              {paypalMsg && (
                <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 text-center">
                  {paypalMsg}
                </div>
              )}

              {paymentMethod === 'stripe' ? (
                /* Currently on Stripe — offer PayPal switch */
                <>
                  {showPaypal ? (
                    <div className="max-w-xs space-y-2">
                      <p className="text-xs text-slate-400">Subscribe via PayPal:</p>
                      <PayPalButton
                        tier={user?.subscription_tier === 'pro' ? 'starter' : 'pro'}
                        onRedirecting={() => setPaypalMsg('Redirecting to PayPal...')}
                        onError={(err) => setPaypalMsg(`❌ ${err}`)}
                      />
                      <button onClick={() => setShowPaypal(false)}
                        className="text-xs text-slate-500 hover:text-white transition-all cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowPaypal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0070BA]/10 text-[#0070BA] border border-[#0070BA]/20 hover:bg-[#0070BA]/20 transition-all cursor-pointer">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.329c-.521 0-.967.38-1.05.896l-.633 3.946-.633 3.944-.633 3.946-.634 3.946a.641.641 0 0 1-.633.74H4.224l.633-3.946.634-3.946.633-3.946.634-3.946.632-3.946Z"/>
                      </svg>
                      Switch to PayPal
                    </button>
                  )}
                </>
              ) : paymentMethod === 'paypal' ? (
                /* Currently on PayPal — show PayPal management + Stripe switch */
                <div className="space-y-3">
                  <a
                    href="https://www.paypal.com/myaccount/autopay/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#0070BA]/10 text-[#0070BA] border border-[#0070BA]/20 hover:bg-[#0070BA]/20 transition-all"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.329c-.521 0-.967.38-1.05.896l-.633 3.946-.633 3.944-.633 3.946-.634 3.946a.641.641 0 0 1-.633.74H4.224l.633-3.946.634-3.946.633-3.946.634-3.946.632-3.946Z"/>
                    </svg>
                    Manage PayPal Billing
                  </a>
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400 mb-2">Switch to card payments:</p>
                    <a
                      href={`/api/billing/create-checkout-session?tier=${user?.subscription_tier}`}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all inline-block"
                    >
                      Switch to Stripe
                    </a>
                  </div>
                </div>
              ) : (
                /* No payment method yet */
                <div className="max-w-xs">
                  <PayPalButton
                    tier="pro"
                    onError={(err) => setPaypalMsg(`❌ ${err}`)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* API Usage */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-display font-bold text-white text-base mb-5">Monthly Usage</h3>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Posts generated this month</span>
                <span className="text-white font-semibold">{postsMade} / {plan.postsPerMonth}</span>
              </div>
              <div className="bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  style={{ width: `${usagePct}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Resets on {nextReset.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}