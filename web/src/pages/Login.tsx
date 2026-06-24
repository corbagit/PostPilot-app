import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setSubmitting(true)
    const result = await login(email, password)
    setSubmitting(false)
    if (result.ok) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/"><img src="/brand/logo-full.svg" alt="PostPilot" className="h-9 mx-auto" /></Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="font-display font-extrabold text-xl mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Log in to your PostPilot account</p>

          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 outline-none text-sm transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 outline-none text-sm transition-all" />
            </div>
            <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-semibold gradient-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
              {submitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don't have an account? <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}