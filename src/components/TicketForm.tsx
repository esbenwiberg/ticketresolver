'use client'

import { useState, useRef, useCallback } from 'react'
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

interface Props {
  repos: RepoConfig[]
  onResult: (result: ResolveResult) => void
  onClear: () => void
  hasResult: boolean
}

export default function TicketForm({ repos, onResult, onClear, hasResult }: Props) {
  const [text, setText] = useState('')
  const [repoSlug, setRepoSlug] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [screenshotName, setScreenshotName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      // Strip data URL prefix to get raw base64
      const base64 = dataUrl.split(',')[1]
      setScreenshot(base64)
      setScreenshotName(file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please paste a ticket description')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          repoSlug: repoSlug || undefined,
          screenshotBase64: screenshot || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to analyze ticket')
      onResult(data as ResolveResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const clearScreenshot = () => {
    setScreenshot(null)
    setScreenshotName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Repo picker */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Target codebase (optional)
        </label>
        <select
          value={repoSlug}
          onChange={(e) => setRepoSlug(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">— No codebase search —</option>
          {repos.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ticket textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Ticket</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste ticket description, error message, or symptoms..."
          rows={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Screenshot upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Screenshot (optional)
        </label>
        {screenshot ? (
          <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
            <img
              src={`data:image/png;base64,${screenshot}`}
              alt="Screenshot preview"
              className="h-12 w-20 object-cover rounded border border-gray-600"
            />
            <span className="text-sm text-gray-300 flex-1 truncate">{screenshotName}</span>
            <button
              onClick={clearScreenshot}
              className="text-gray-400 hover:text-red-400 text-xs transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
            }`}
          >
            <p className="text-sm text-gray-400">
              Drag & drop an image or <span className="text-indigo-400">click to browse</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            'Analyze Ticket'
          )}
        </button>
        {hasResult && (
          <button
            onClick={() => { onClear(); setText(''); setScreenshot(null); setScreenshotName('') }}
            className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2.5 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
