'use client'

import { useState, useEffect, useCallback } from 'react'
import LearningCard from '@/components/LearningCard'
import LearningDetailPanel from '@/components/LearningDetailPanel'
import { Learning, LearningsStats } from '@/lib/types'

const CATEGORIES = ['all', 'auth', 'config', 'performance', 'deployment', 'network', 'bug', 'other']
const MIN_CONFIDENCE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '≥ 40%', value: '0.4' },
  { label: '≥ 60%', value: '0.6' },
  { label: '≥ 75%', value: '0.75' },
  { label: '≥ 90%', value: '0.9' },
]

export default function LearningsPage() {
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [stats, setStats] = useState<LearningsStats | null>(null)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<Learning | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [category, setCategory] = useState('all')
  const [minConfidence, setMinConfidence] = useState('')
  const [showDismissed, setShowDismissed] = useState(false)

  const fetchLearnings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (minConfidence) params.set('minConfidence', minConfidence)
      if (showDismissed) params.set('dismissed', 'true')

      const res = await fetch(`/api/learnings?${params}`)
      const data = await res.json()
      setLearnings(data.learnings ?? [])
      setStats(data.stats ?? null)
      setTotal(data.total ?? 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [category, minConfidence, showDismissed])

  useEffect(() => {
    fetchLearnings()
  }, [fetchLearnings])

  const handleDismissed = (updated: Learning) => {
    setLearnings((prev) =>
      showDismissed
        ? prev.map((l) => (l.id === updated.id ? updated : l))
        : prev.filter((l) => l.id !== updated.id),
    )
    setSelected(updated)
    if (stats) {
      setStats({
        ...stats,
        activeCount: stats.activeCount - 1,
        dismissedCount: stats.dismissedCount + 1,
      })
    }
  }

  return (
    <div className="min-h-full bg-gray-950 py-10 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Hivemind Learnings</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Self-improving knowledge base built from accepted ticket resolutions.
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Learnings" value={stats.totalCount} />
            <StatCard label="Active" value={stats.activeCount} />
            <StatCard
              label="Avg Confidence"
              value={`${Math.round(stats.avgConfidence * 100)}%`}
            />
            <StatCard label="Dismissed" value={stats.dismissedCount} />
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          {/* Category */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Min confidence */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Min Confidence</label>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {MIN_CONFIDENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Show dismissed toggle */}
          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <span className="text-xs text-gray-400">Show Dismissed</span>
            <div
              onClick={() => setShowDismissed((v) => !v)}
              className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${
                showDismissed ? 'bg-indigo-600' : 'bg-gray-700'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  showDismissed ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : learnings.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No learnings found</p>
            <p className="text-sm mt-1">Accept ticket suggestions to start building the knowledge base.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">{total} learning{total !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {learnings.map((l) => (
                <LearningCard key={l.id} learning={l} onClick={() => setSelected(l)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <LearningDetailPanel
          learning={selected}
          onClose={() => setSelected(null)}
          onDismissed={handleDismissed}
        />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
    </div>
  )
}
