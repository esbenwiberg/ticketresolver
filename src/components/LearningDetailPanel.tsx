'use client'

import { useState } from 'react'
import { Learning, LearningEvent } from '@/lib/types'

interface Props {
  learning: Learning
  onClose: () => void
  onDismissed: (updated: Learning) => void
}

const EVENT_COLORS: Record<LearningEvent['type'], string> = {
  created: 'text-blue-400 bg-blue-900/30 border-blue-800',
  reinforced: 'text-green-400 bg-green-900/30 border-green-800',
  contradicted: 'text-red-400 bg-red-900/30 border-red-800',
  dismissed: 'text-gray-400 bg-gray-800 border-gray-700',
}

const EVENT_ICONS: Record<LearningEvent['type'], string> = {
  created: '✦',
  reinforced: '↑',
  contradicted: '↓',
  dismissed: '×',
}

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

export default function LearningDetailPanel({ learning, onClose, onDismissed }: Props) {
  const [dismissing, setDismissing] = useState(false)
  const [dismissed, setDismissed] = useState(learning.dismissedAt !== null)

  const handleDismiss = async () => {
    if (!confirm('Dismiss this learning? It will be excluded from future suggestions.')) return
    setDismissing(true)
    try {
      const res = await fetch(`/api/learnings/${learning.id}/dismiss`, { method: 'POST' })
      const data = await res.json()
      setDismissed(true)
      onDismissed(data.learning)
    } catch {
      alert('Failed to dismiss learning')
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-gray-900 border-l border-gray-800 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
              {learning.id}
            </span>
            {dismissed && (
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">
                dismissed
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Content */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Fix</h3>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
              {learning.content}
            </pre>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Confidence</span>
              <span className={`text-sm font-bold ${
                learning.confidence >= 0.75
                  ? 'text-green-400'
                  : learning.confidence >= 0.5
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}>
                {Math.round(learning.confidence * 100)}%
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  dismissed
                    ? 'bg-gray-600'
                    : learning.confidence >= 0.75
                    ? 'bg-green-500'
                    : learning.confidence >= 0.5
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${learning.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaCell label="Category" value={learning.category} />
            <MetaCell label="Reinforcements" value={`+${learning.reinforcements}`} />
            <MetaCell label="Contradictions" value={`${learning.contradictions}`} />
            <MetaCell label="Source Tickets" value={learning.sourceTicketIds.length.toString()} />
            <MetaCell label="Created" value={formatDate(learning.createdAt)} />
            <MetaCell label="Last Used" value={formatDate(learning.lastUsedAt)} />
            {dismissed && (
              <MetaCell label="Dismissed" value={formatDate(learning.dismissedAt)} />
            )}
          </div>

          {/* Tags */}
          {learning.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {learning.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source tickets */}
          {learning.sourceTicketIds.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Source Tickets
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {learning.sourceTicketIds.map((id) => (
                  <span key={id} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event timeline */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              Event History
            </h3>
            <div className="space-y-2">
              {[...learning.events].reverse().map((event) => (
                <div
                  key={event.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${EVENT_COLORS[event.type]}`}
                >
                  <span className="font-bold mt-px shrink-0">{EVENT_ICONS[event.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium uppercase tracking-wide">{event.type}</span>
                      <span className="text-gray-500 shrink-0">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 opacity-80">{event.evidence}</p>
                    {event.ticketId && (
                      <p className="mt-0.5 font-mono opacity-60">ref: {event.ticketId}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!dismissed && (
          <div className="px-5 py-4 border-t border-gray-800 sticky bottom-0 bg-gray-900">
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="w-full bg-red-900/30 hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 border border-red-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {dismissing ? 'Dismissing…' : 'Dismiss Learning'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-950 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-200 font-medium truncate">{value}</p>
    </div>
  )
}
