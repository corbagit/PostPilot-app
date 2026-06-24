import { useState } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'Twitter / X', icon: '🐦' },
]

interface PostData {
  id: string
  seed_idea: string
  platform: string
  content: string
  caption: string
  hashtags: string
  status: string
  created_at: string
}

const platformIcons: Record<string, string> = {
  instagram: '📷',
  linkedin: '💼',
  twitter: '🐦',
}

const platformNames: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter / X',
}

export default function Generate() {
  const { user, refreshUser } = useAuth()
  const [idea, setIdea] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['instagram'])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<PostData[] | null>(null)
  const [error, setError] = useState('')

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idea.trim()) {
      setError('Please enter an idea')
      return
    }
    if (platforms.length === 0) {
      setError('Please select at least one platform')
      return
    }
    setError('')
    setGenerating(true)

    try {
      // Real API call to backend
      const res = await api.post('/posts/generate', {
        seed_idea: idea.trim(),
        platforms,
      })
      setResults(res.data.posts)
      // Refresh user data to get updated post count
      refreshUser()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to generate content. Please try again.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  // Group posts by platform
  const groupedResults = results
    ? Object.entries(
        results.reduce<Record<string, PostData[]>>((acc, post) => {
          if (!acc[post.platform]) acc[post.platform] = []
          acc[post.platform].push(post)
          return acc
        }, {})
      ).map(([platform, posts]) => ({
        platform,
        platformName: platformNames[platform] || platform,
        icon: platformIcons[platform] || '📱',
        posts,
      }))
    : null

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-2xl font-extrabold text-white font-display">✨ Generate Content</h1>
          <p className="text-slate-400 text-sm mt-1">Turn one raw idea into a week of social posts</p>
        </div>

        <div className="p-6 grid lg:grid-cols-[400px_1fr] gap-6 items-start">
          {/* Input Form */}
          <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-xl p-6 sticky top-6">
            <h3 className="font-display font-bold text-white text-base mb-5">✏️ Seed Your Idea</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">What's your raw idea?</label>
                <textarea
                  value={idea}
                  onChange={e => setIdea(e.target.value)}
                  placeholder="e.g., How time-blocking saved me 2 hours a day"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 outline-none resize-y transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Platforms</label>
                <div className="space-y-2">
                  {PLATFORMS.map(p => (
                    <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      platforms.includes(p.id)
                        ? 'bg-blue-500/10 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}>
                      <input type="checkbox" checked={platforms.includes(p.id)}
                        onChange={() => togglePlatform(p.id)} className="accent-blue-500 w-4 h-4" />
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button type="submit" disabled={generating}
                className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
                {generating ? '✨ Generating...' : '🚀 Generate Content'}
              </button>

              <p className="text-xs text-slate-500 text-center">
                {user?.subscription_tier === 'pro' ? '30 posts/month' :
                 user?.subscription_tier === 'starter' ? '10 posts/month' : '3 posts/month (Free)'}
                {' · '}
                {user?.posts_generated || 0} used
              </p>
            </div>
          </form>

          {/* Results */}
          <div>
            {!results && !generating && (
              <div className="text-center py-24 text-slate-500">
                <div className="text-5xl mb-4">💡</div>
                <h3 className="text-xl font-bold text-white font-display mb-2">Ready for Your First Idea</h3>
                <p className="text-sm max-w-sm mx-auto">Type in a raw idea, select your platforms, and let PostPilot generate a week's worth of content.</p>
              </div>
            )}

            {generating && (
              <div className="text-center py-24">
                <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Crafting your content calendar...</p>
              </div>
            )}

            {results && !generating && groupedResults && (
              <div className="space-y-8">
                {groupedResults.map(group => (
                  <div key={group.platform}>
                    <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-800">
                      <span className="text-xl">{group.icon}</span>
                      <h3 className="font-display font-bold text-white text-lg">{group.platformName}</h3>
                      <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{group.posts.length} post{group.posts.length > 1 ? 's' : ''}</span>
                    </div>

                    <div className="space-y-3">
                      {group.posts.map((post, i) => (
                        <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full">
                                Day {i + 1}
                              </span>
                              <span className="text-xs text-slate-500">{post.status}</span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-white mb-2">{post.seed_idea}</p>
                          <pre className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap bg-slate-950 p-3 rounded-lg mb-3 max-h-32 overflow-y-auto font-sans">
                            {post.content}
                          </pre>
                          <p className="text-xs text-slate-500 mb-2 italic">{post.caption}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {JSON.parse(post.hashtags || '[]').map((tag: string) => (
                              <span key={tag} className="text-xs text-blue-400 bg-blue-500/8 px-2.5 py-0.5 rounded-full">#{tag}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="text-center bg-slate-900 border border-slate-800 rounded-xl p-8">
                  <p className="text-slate-400 text-sm mb-4">Want to generate content for another idea?</p>
                  <button onClick={() => { setIdea(''); setResults(null); setError('') }}
                    className="px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 transition-all cursor-pointer">
                    ✨ Generate New Batch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}