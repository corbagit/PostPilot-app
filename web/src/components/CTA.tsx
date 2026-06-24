import { Link } from 'react-router-dom'

export default function CTA() {
  return (
    <section className="py-20 bg-slate-900 text-white text-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent rounded-full pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
          Ready to Take Your <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Content Flight?</span>
        </h2>
        <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
          Reclaim 5+ hours of your week. Start your 14-day free trial today and turn your first idea into a week of content.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register" className="inline-flex items-center px-8 py-3.5 rounded-xl text-white font-semibold gradient-primary hover:opacity-90 transition-all shadow-xl shadow-blue-500/25 text-base">
            Start Free Trial
          </Link>
          <a href="/#features" className="inline-flex items-center px-8 py-3.5 rounded-xl font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all text-base">
            Learn More
          </a>
        </div>
      </div>
    </section>
  )
}