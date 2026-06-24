export default function Features() {
  const features = [
    {
      icon: '🎯',
      title: 'One Idea → Full Flight Path',
      desc: "Don't just generate 'a post.' Get a complete 5-day content calendar that turns a single thought into a coherent weekly narrative.",
      gradient: 'from-blue-500 to-indigo-500',
    },
    {
      icon: '📱',
      title: 'Platform-Native Optimization',
      desc: 'No more copy-pasting. We tailor every draft to the specific culture, character counts, and algorithms of LinkedIn, X, and Instagram.',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      icon: '🏷️',
      title: 'Reclaim Your Deep Work',
      desc: 'Save 5+ hours every week. We handle the formatting, hashtag research, and image prompting so you can focus on building, not posting.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🎨',
      title: 'AI Image Generation',
      desc: 'Generate on-brand visuals for your posts — carousels, quote graphics, and social images (Pro plan).',
      gradient: 'from-pink-500 to-amber-500',
    },
    {
      icon: '📅',
      title: 'Content Calendar',
      desc: 'View your week at a glance, drag to reorder, and schedule posts across all your connected platforms.',
      gradient: 'from-emerald-500 to-cyan-500',
    },
    {
      icon: '📊',
      title: 'Analytics & Insights',
      desc: 'Track engagement, see what resonates, and refine your strategy with data-driven recommendations.',
      gradient: 'from-cyan-500 to-blue-500',
    },
  ]

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Everything You Need to<br />
            <span className="gradient-text">Stay Consistent</span>
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            No more staring at a blank screen. PostPilot handles the hard work so you can focus on growing your audience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ animation: `fadeInUp 0.6s ease-out ${i * 0.1}s forwards`, opacity: 0 }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-xl mb-5`}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0;transform:translateY(20px) } to { opacity:1;transform:translateY(0) } }`}</style>
    </section>
  )
}