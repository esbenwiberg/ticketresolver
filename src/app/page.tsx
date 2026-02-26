'use client'

import { useState, useEffect } from 'react'
import TicketForm from '@/components/TicketForm'
import SuggestionList from '@/components/SuggestionList'
import { RepoConfig, Suggestion } from '@/lib/types'

interface ResolveResult {
  suggestions: Suggestion[]
  resolveId: string
  reinforceIds: string[]
  contradictIds: string[]
  context: {
    prismHits: number
    similarTickets: number
    relevantLearnings: number
  }
}

export default function Home() {
  const [repos, setRepos] = useState<RepoConfig[]>([])
  const [result, setResult] = useState<ResolveResult | null>(null)

  useEffect(() => {
    fetch('/api/repos')
      .then((r) => r.json())
      .then((d) => setRepos(d.repos ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-full bg-gray-950 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Resolve Ticket</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Paste a support ticket and get AI-powered fix suggestions, backed by your knowledge base.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <TicketForm
            repos={repos}
            onResult={(r) => setResult(r)}
            onClear={() => setResult(null)}
            hasResult={result !== null}
          />
        </div>

        {/* Results */}
        {result && (
          <div className="mt-6">
            <SuggestionList
              suggestions={result.suggestions}
              resolveId={result.resolveId}
              reinforceIds={result.reinforceIds ?? []}
              contradictIds={result.contradictIds ?? []}
              context={result.context}
              onNoneOfThese={() => setResult(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
