export default function Testimonials() {
  const testimonials = [
    {
      quote: "I used to spend my entire Sunday planning content. With PostPilot, I drop in my notes from the week and have a full schedule by the time my coffee is finished. It's like having a social media manager for the price of a few lunches.",
      name: "Sarah C.",
      role: "Independent Designer",
      avatar: "SC",
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      quote: "My LinkedIn engagement has doubled since I started using PostPilot. The AI actually understands how to transition my deep-work insights into punchy, professional posts that start conversations.",
      name: "David R.",
      role: "Executive Coach",
      avatar: "DR",
      gradient: "from-indigo-500 to-purple-500",
    },
    {
      quote: "Running a cafe means I don't have time to think about 'trending audio' or hashtag sets. PostPilot keeps our Instagram active and aesthetic with zero effort from my team. It just works.",
      name: "Elena G.",
      role: "Founder of Brew & Bloom",
      avatar: "EG",
      gradient: "from-purple-500 to-pink-500",
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Trusted by <span className="gradient-text">Creators</span>
          </h2>
          <p className="text-slate-500 text-lg">See what early adopters are saying about PostPilot.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-lg">★</span>
                ))}
              </div>
              <p className="text-slate-600 leading-relaxed mb-6 text-sm">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}