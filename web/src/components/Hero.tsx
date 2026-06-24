import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-20 text-center">
      {/* Background glow */}
      <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-500/5 via-indigo-500/5 to-transparent rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-sm font-semibold mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ⚡️ Save 5+ hours every week on social media
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
          Turn <span className="gradient-text">One Raw Idea</span><br />
          Into a Week of Social Content
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop staring at a blank screen. PostPilot uses AI to transform your unique insights into platform-optimized posts for Instagram, LinkedIn, and Twitter/X — in seconds.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register" className="inline-flex items-center px-8 py-3.5 rounded-xl text-white font-semibold gradient-primary hover:opacity-90 transition-all shadow-xl shadow-blue-500/25 text-base">
            Start Free Trial
          </Link>
          <a href="/#features" className="inline-flex items-center px-8 py-3.5 rounded-xl font-semibold bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:shadow-md transition-all text-base">
            See How It Works
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-16">
          {[
            { value: '5+', label: 'Hours Saved/Week' },
            { value: '3', label: 'Platforms Supported' },
            { value: '30', label: 'Posts/Month (Pro)' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-blue-500 font-display">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}