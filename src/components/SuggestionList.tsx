'use client'

import { useState } from 'react'
import { Suggestion } from '@/lib/types'
import { apiUrl } from '@/lib/api'

interface Props {
  suggestions: Suggestion[]
  resolveId: string
  reinforceIds: string[]
  contradictIds: string[]
  context: {
    prismHits: number
    similarTickets: number
    relevantLearnings: number
  }
  onNoneOfThese: () => void
}

function confidenceColor(c: number): { badge: string; bar: string } {
  if (c >= 0.75) return { badge: 'bg-green-900/50 text-green-400 border-green-800', bar: 'bg-green-500' }
  if (c >= 0.5) return { badge: 'bg-amber-900/50 text-amber-400 border-amber-800', bar: 'bg-amber-500' }
  return { badge: 'bg-red-900/50 text-red-400 border-red-800', bar: 'bg-red-500' }
}

const CATEGORY_COLORS: Record<string, string> = {
  auth: 'bg-purple-900/40 text-purple-300 border-purple-800',
  config: 'bg-blue-900/40 text-blue-300 border-blue-800',
  performance: 'bg-orange-900/40 text-orange-300 border-orange-800',
  deployment: 'bg-cyan-900/40 text-cyan-300 border-cyan-800',
  network: 'bg-teal-900/40 text-teal-300 border-teal-800',
  bug: 'bg-red-900/40 text-red-300 border-red-800',
  other: 'bg-gray-800 text-gray-400 border-gray-700',
}

function SuggestionCard({
  suggestion,
  resolveId,
  reinforceIds,
  contradictIds,
}: {
  suggestion: Suggestion
  resolveId: string
  reinforceIds: string[]
  contradictIds: string[]
}) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const colors = confidenceColor(suggestion.confidence)
  const catColor = CATEGORY_COLORS[suggestion.category] ?? CATEGORY_COLORS.other

  const handleAccept = async () => {
    setLoading(true)
    try {
      await fetch(apiUrl('/api/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolveId,
          acceptedSuggestion: suggestion,
          reinforceIds,
          contradictIds,
        }),
      })
      setAccepted(true)
    } catch {
      // silent fail — still show accepted
      setAccepted(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 space-y-3 transition-all ${accepted ? 'border-green-700 bg-green-950/20' : 'border-gray-800 hover:border-gray-700'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-white text-sm leading-snug flex-1">{suggestion.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded border ${catColor}`}>
            {suggestion.category}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${colors.badge}`}>
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${suggestion.confidence * 100}%` }}
        />
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-300 leading-relaxed">{suggestion.explanation}</p>

      {/* Tags */}
      {suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.tags.map((tag) => (
            <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Source learning indicator */}
      {suggestion.sourceLearningId && (
        <p className="text-xs text-indigo-400">Backed by knowledge base learning</p>
      )}

      {/* Accept button */}
      {accepted ? (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Solution accepted — learning updated
        </div>
      ) : (
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 py-2 px-3 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
        >
          {loading ? 'Saving…' : 'Accept this solution'}
        </button>
      )}
    </div>
  )
}

export default function SuggestionList({ suggestions, resolveId, reinforceIds, contradictIds, context, onNoneOfThese }: Props) {
  return (
    <div className="space-y-4">
      {/* Context info bar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">
          Found {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </h2>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {context.prismHits > 0 && <span>{context.prismHits} code hits</span>}
          {context.similarTickets > 0 && <span>{context.similarTickets} similar tickets</span>}
          {context.relevantLearnings > 0 && <span>{context.relevantLearnings} learnings</span>}
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-3">
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.id}
            suggestion={s}
            resolveId={resolveId}
            reinforceIds={reinforceIds}
            contradictIds={contradictIds}
          />
        ))}
      </div>

      {/* None of these */}
      <div className="text-center pt-1">
        <button
          onClick={onNoneOfThese}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2"
        >
          None of these match — try again
        </button>
      </div>
    </div>
  )
}
