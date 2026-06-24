import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PayPalButton from './PayPalButton'

const plans = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$29',
    period: '/month',
    desc: '10 posts/month · 1 platform',
    features: ['AI-powered post generation', 'Smart hashtag suggestions', 'Content calendar view', 'Basic analytics', 'Email support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$59',
    period: '/month',
    desc: '30 posts/month · 3 platforms',
    features: ['Everything in Starter', 'AI image generation', 'Multi-platform scheduling', 'Advanced analytics & insights', 'Priority support', 'Custom branding'],
    cta: 'Start Free Trial',
    popular: true,
    badge: 'Most Popular',
  },
  {
    name: 'Annual',
    price: '$49',
    period: '/month',
    desc: '30 posts/month · 3 platforms',
    original: '(normally $708/yr)',
    features: ['Everything in Pro', '2 months free (vs monthly)', 'Billed annually', 'Priority onboarding', 'Early access to new features'],
    cta: 'Get Annual Plan',
    popular: false,
    badge: 'Save 17%',
  },
]

export default function Pricing() {
  const { user } = useAuth()
  const [paypalError, setPaypalError] = useState('')

  return (
    <section id="pricing" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Simple, Transparent<br />
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-slate-500 text-lg">First month FREE for our first 500 pilots. Use code: <span className="font-bold text-blue-600">PILOT500</span></p>
        </div>

        {paypalError && (
          <div className="max-w-5xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 text-sm font-semibold">
            {paypalError}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, idx) => (
            <div
              key={`${plan.name}-${idx}`}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.popular
                  ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.05]'
                  : 'border border-slate-200 shadow-md'
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white ${
                  plan.popular ? 'gradient-primary' : 'bg-purple-500'
                }`}>
                  {plan.badge}
                </div>
              )}

              <h3 className="font-display font-bold text-lg mb-2">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold font-display">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <p className="text-sm text-slate-400 mb-1">{plan.desc}</p>
              {plan.original && <p className="text-xs text-slate-400 mb-4">{plan.original}</p>}
              {!plan.original && <div className="h-6" />}

              <ul className="space-y-2 my-6">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span> {f}
                  </li>
                ))}
              </ul>

              {/* Primary CTA — Free Trial / Register */}
              <Link
                to="/register"
                className={`block text-center py-3 px-6 rounded-xl font-semibold text-sm transition-all mb-3 ${
                  plan.popular
                    ? 'text-white gradient-primary hover:opacity-90 shadow-lg shadow-blue-500/20'
                    : 'text-slate-700 bg-white border border-slate-300 hover:border-slate-400'
                }`}
              >
                {plan.cta}
              </Link>

              {/* PayPal Payment Option (Starter and Pro only — not Annual) */}
              {'id' in plan && (
                <div className="border-t border-slate-100 pt-3 mt-1">
                  {user ? (
                    <PayPalButton
                      tier={plan.id}
                      label={`Pay with PayPal - ${plan.price}`}
                      onError={(err) => setPaypalError(err)}
                    />
                  ) : (
                    <Link
                      to="/register"
                      className="block w-full text-center py-2.5 px-4 rounded-xl text-xs font-semibold text-[#0070BA] border border-[#0070BA]/20 hover:bg-[#0070BA]/5 transition-all"
                    >
                      Sign up to pay with PayPal &rarr;
                    </Link>
                  )}
                </div>
              )}

              {/* Annual plan gets a note instead */}
              {!('id' in plan) && (
                <div className="border-t border-slate-100 pt-3 mt-1">
                  <p className="text-xs text-center text-slate-400">Annual billing via free trial only</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Payment methods note */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1 text-blue-600 font-semibold">🔵 Stripe</span>
          <span className="text-slate-300">·</span>
          <span className="flex items-center gap-1 text-[#0070BA] font-semibold">🅿️ PayPal</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">Secure checkout</span>
        </div>

        {/* Launch promo */}
        <div className="mt-10 text-center p-6 bg-blue-50 rounded-2xl border border-blue-200/50 max-w-2xl mx-auto">
          <p className="font-semibold text-blue-700">🚀 Launch Promo: First month free for early adopters</p>
          <p className="text-sm text-blue-500 mt-1">No commitment. Cancel anytime. Start creating content today.</p>
        </div>
      </div>
    </section>
  )
}