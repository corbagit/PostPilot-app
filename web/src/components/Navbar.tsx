import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/generate') ||
    location.pathname.startsWith('/my-posts') ||
    location.pathname.startsWith('/settings')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (isDashboard) return null // Dashboard uses its own sidebar

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <img src="/brand/logo-full.svg" alt="PostPilot" className="h-8" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="/#features" className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">Features</a>
          <a href="/#pricing" className="text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors">Pricing</a>
          {!user ? (
            <>
              <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition-all">Log In</Link>
              <Link to="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg gradient-primary hover:opacity-90 transition-all shadow-md shadow-blue-500/20">Get Started</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg gradient-primary hover:opacity-90 transition-all shadow-md shadow-blue-500/20">Dashboard</Link>
              <button onClick={handleLogout} className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-300 hover:border-slate-400 transition-all cursor-pointer">Log Out</button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}