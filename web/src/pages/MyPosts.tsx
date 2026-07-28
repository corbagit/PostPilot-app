import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import Sidebar from '../components/Sidebar'

interface Post {
  id: string
  seed_idea: string
  platform: string
  content: string
  caption: string
  hashtags: string
  status: 'draft' | 'scheduled' | 'published'
  created_at: string
}

const platformIcons: Record<string, string> = {
  instagram: '📷',
  linkedin: '💼',
  twitter: '🐦',
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  scheduled: 'bg-blue-500/10 text-blue-400',
  published: 'bg-emerald-500/10 text-emerald-400',
}

export default function MyPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/posts')
      setPosts(res.data.posts)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text

  const filteredPosts = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  const updateStatus = async (id: string, status: 'draft' | 'scheduled' | 'published') => {
    setUpdatingId(id)
    try {
      await api.patch(`/posts/${id}`, { status })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    } catch {
      // silent
    } finally {
      setUpdatingId(null)
    }
  }

  const deletePost = async (id: string) => {
    setUpdatingId(id)
    try {
      await api.delete(`/posts/${id}`)
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch {
      // silent
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="border-b border-slate-800 p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white font-display">📝 My Posts</h1>
            <p className="text-slate-400 text-sm mt-1">{posts.length} total posts generated</p>
          </div>

          <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
            {(['all', 'draft', 'scheduled', 'published'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === f ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'
                }`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-24">
              <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Loading your posts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-white font-display mb-2">Failed to load posts</h3>
              <p className="text-slate-400 text-sm mb-4">{error}</p>
              <button onClick={fetchPosts}
                className="px-6 py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 transition-all cursor-pointer">
                Try Again
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-white font-display mb-2">No posts yet</h3>
              <p className="text-sm">Generate your first batch of content to see it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map(post => {
                const isExpanded = expandedIds.has(post.id)
                return (
                  <div key={post.id} onClick={() => toggleExpand(post.id)}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{platformIcons[post.platform] || '📱'}</span>
                          <span className="text-xs font-semibold text-slate-400 capitalize">{post.platform}</span>
                          <span className="text-xs text-slate-600">·</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[post.status]}`}>
                            {post.status}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-white">{post.seed_idea}</p>
                        {post.content && (
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {isExpanded ? post.content : truncate(post.content, 120)}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Created {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {post.status !== 'published' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(post.id, 'published') }} disabled={updatingId === post.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-all cursor-pointer">
                            {updatingId === post.id ? '...' : 'Publish'}
                          </button>
                        )}
                        {post.status === 'published' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(post.id, 'draft') }} disabled={updatingId === post.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all cursor-pointer">
                            {updatingId === post.id ? '...' : 'Unpublish'}
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); deletePost(post.id) }} disabled={updatingId === post.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer">
                          {updatingId === post.id ? '...' : 'Delete'}
                        </button>
                        <span className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-3" onClick={e => e.stopPropagation()}>
                        {post.caption && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Caption</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{post.caption}</p>
                          </div>
                        )}
                        {post.hashtags && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Hashtags</p>
                            <p className="text-sm text-blue-400">{post.hashtags}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}