import { NextRequest, NextResponse } from 'next/server'
import { searchPrism } from '@/lib/prism'
import { searchMockTickets, getActiveLearnings } from '@/lib/store'
import { generateSuggestions } from '@/lib/claude'
import { resolveStore } from '@/lib/resolveStore'
import { Learning } from '@/lib/types'

function extractTags(text: string): string[] {
  const keywords = [
    'login', 'auth', 'jwt', 'token', 'session', 'password', 'oauth',
    'database', 'db', 'postgres', 'mysql', 'redis', 'mongo',
    'deploy', 'ci', 'cd', 'build', 'docker', 'kubernetes', 'k8s',
    'nginx', 'proxy', 'cdn', 'cors', 'timeout', 'gateway',
    'email', 'smtp', 'notification',
    'memory', 'cpu', 'performance', 'slow', 'leak',
    'websocket', 'socket', 'network', 'dns',
    'cron', 'scheduler', 'job', 'worker',
    'error', 'exception', 'crash', '500', '502', '503', '404',
    'config', 'env', 'secret', 'credentials',
  ]

  const lowerText = text.toLowerCase()
  return keywords.filter((k) => lowerText.includes(k))
}

function findRelevantLearnings(ticketText: string, tags: string[], allLearnings: Learning[]): Learning[] {
  const textLower = ticketText.toLowerCase()
  const scored = allLearnings.map((l) => {
    const tagMatches = l.tags.filter((t) => tags.includes(t) || textLower.includes(t)).length
    const contentWords = l.content.toLowerCase().split(/\s+/)
    const contentMatches = contentWords.filter((w) => w.length > 4 && textLower.includes(w)).length
    return { learning: l, score: tagMatches * 2 + contentMatches }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.learning)
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text?: string; screenshotBase64?: string; repoSlug?: string }
    const { text, screenshotBase64, repoSlug } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Ticket text is required' }, { status: 400 })
    }

    const tags = extractTags(text)

    // Parallel: Prism search + mock ticket search + learnings lookup
    const [prismContext, similarTickets] = await Promise.all([
      repoSlug ? searchPrism(repoSlug, text, 8) : Promise.resolve(''),
      Promise.resolve(searchMockTickets(text)),
    ])

    const allLearnings = getActiveLearnings()
    const relevantLearnings = findRelevantLearnings(text, tags, allLearnings)

    // Update lastUsedAt for retrieved learnings (fire-and-forget update)
    // (done inside generateSuggestions implicitly via usage; store updates happen on feedback)

    const result = await generateSuggestions(
      text,
      prismContext,
      similarTickets,
      relevantLearnings,
      screenshotBase64,
    )

    const resolveId = 'res-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    resolveStore.set(resolveId, {
      reinforceIds: result.reinforceIds,
      contradictIds: result.contradictIds,
    })

    return NextResponse.json({
      suggestions: result.suggestions,
      resolveId,
      reinforceIds: result.reinforceIds,
      contradictIds: result.contradictIds,
      context: {
        prismHits: prismContext ? prismContext.split('---').length - 1 : 0,
        similarTickets: similarTickets.length,
        relevantLearnings: relevantLearnings.length,
      },
    })
  } catch (err) {
    console.error('/api/resolve error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

