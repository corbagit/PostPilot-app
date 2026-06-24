import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <img src="/brand/logo-white.svg" alt="PostPilot" className="h-7 mb-4" />
            <p className="text-sm leading-relaxed max-w-xs text-slate-500">
              Transform one raw idea into a week's worth of platform-optimized social media content.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a href="/#features" className="hover:text-white transition-colors">Features</a>
              <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link to="/register" className="hover:text-white transition-colors">Get Started</Link>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <div className="flex flex-col gap-2 text-sm">
              <span className="hover:text-white transition-colors cursor-default">About</span>
              <span className="hover:text-white transition-colors cursor-default">Blog</span>
              <span className="hover:text-white transition-colors cursor-default">Contact</span>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <div className="flex flex-col gap-2 text-sm">
              <span className="hover:text-white transition-colors cursor-default">Privacy</span>
              <span className="hover:text-white transition-colors cursor-default">Terms</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} PostPilot. All rights reserved.</span>
          <div className="flex gap-4 text-slate-500">
            <span className="hover:text-white transition-colors cursor-default">Instagram</span>
            <span className="hover:text-white transition-colors cursor-default">LinkedIn</span>
            <span className="hover:text-white transition-colors cursor-default">Twitter/X</span>
          </div>
        </div>
      </div>
    </footer>
  )
}