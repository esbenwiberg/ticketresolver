'use client'

import { Learning } from '@/lib/types'

interface Props {
  learning: Learning
  onClick: () => void
}

function confidenceColor(c: number, dismissed: boolean) {
  if (dismissed) return { bar: 'bg-gray-600', text: 'text-gray-500', badge: 'text-gray-500 border-gray-700' }
  if (c >= 0.75) return { bar: 'bg-green-500', text: 'text-green-400', badge: 'text-green-400 border-green-800' }
  if (c >= 0.5) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'text-amber-400 border-amber-800' }
  return { bar: 'bg-red-500', text: 'text-red-400', badge: 'text-red-400 border-red-800' }
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: 'bg-purple-900/40 text-purple-300',
  config: 'bg-blue-900/40 text-blue-300',
  performance: 'bg-orange-900/40 text-orange-300',
  deployment: 'bg-cyan-900/40 text-cyan-300',
  network: 'bg-teal-900/40 text-teal-300',
  bug: 'bg-red-900/40 text-red-300',
  other: 'bg-gray-800 text-gray-400',
}

function timeAgo(date: Date | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function LearningCard({ learning, onClick }: Props) {
  const dismissed = learning.dismissedAt !== null
  const colors = confidenceColor(learning.confidence, dismissed)
  const catColor = CATEGORY_COLORS[learning.category] ?? CATEGORY_COLORS.other

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-gray-600 space-y-3 ${
        dismissed ? 'border-gray-800 opacity-60' : 'border-gray-800'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColor}`}>
          {learning.category}
        </span>
        {dismissed && (
          <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">dismissed</span>
        )}
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Confidence</span>
          <span className={`text-xs font-bold ${colors.text}`}>
            {Math.round(learning.confidence * 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar}`}
            style={{ width: `${learning.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Content preview */}
      <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">{learning.content}</p>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="text-green-500">+{learning.reinforcements}</span>
        {learning.contradictions > 0 && (
          <span className="text-red-500">−{learning.contradictions}</span>
        )}
        <span className="ml-auto">{timeAgo(learning.lastUsedAt)}</span>
      </div>

      {/* Tags */}
      {learning.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {learning.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {learning.tags.length > 4 && (
            <span className="text-xs text-gray-600">+{learning.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}
