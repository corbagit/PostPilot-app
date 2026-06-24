import { useState } from 'react'
import api from '../api/client'

interface PayPalButtonProps {
  tier: 'starter' | 'pro'
  label?: string
  onRedirecting?: () => void
  onError?: (err: string) => void
}

export default function PayPalButton({ tier, label, onRedirecting, onError }: PayPalButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setLoading(true)
    setError('')
    onRedirecting?.()

    try {
      const res = await api.post('/paypal/create-subscription', {
        plan_id: `postpilot_${tier}_monthly`,
        tier,
      })

      const { approval_url } = res.data

      if (approval_url) {
        // Redirect user to PayPal approval page
        window.location.href = approval_url
      } else {
        setError('No approval URL returned from server')
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create PayPal subscription'
      setError(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-[#0070BA] text-white hover:bg-[#003087] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating subscription...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.329c-.521 0-.967.38-1.05.896l-.633 3.946-.633 3.944-.633 3.946-.634 3.946a.641.641 0 0 1-.633.74H4.224l.633-3.946.634-3.946.633-3.946.634-3.946.632-3.946Z"/>
            </svg>
            {label || `Subscribe with PayPal`}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      <p className="text-xs text-center text-slate-500">Secure checkout via PayPal</p>
    </div>
  )
}