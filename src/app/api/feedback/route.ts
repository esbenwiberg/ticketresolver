import { NextRequest, NextResponse } from 'next/server'
import {
  getLearnings,
  createLearning,
  reinforceLearning,
  contradictLearning,
} from '@/lib/store'
import { Suggestion } from '@/lib/types'

function isSimilarContent(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const wordsA = new Set(normalize(a).split(/\s+/).filter((w) => w.length > 3))
  const wordsB = new Set(normalize(b).split(/\s+/).filter((w) => w.length > 3))
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return union > 0 && intersection / union > 0.4
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      resolveId?: string
      acceptedSuggestion: Suggestion
      reinforceIds?: string[]
      contradictIds?: string[]
    }

    const { acceptedSuggestion, reinforceIds = [], contradictIds = [] } = body

    if (!acceptedSuggestion) {
      return NextResponse.json({ error: 'acceptedSuggestion is required' }, { status: 400 })
    }

    // Check if a learning with similar content already exists
    const { learnings: existing } = getLearnings({ showDismissed: false })
    const matchingLearning = existing.find((l) =>
      isSimilarContent(l.content, acceptedSuggestion.explanation),
    )

    let resultLearning

    if (matchingLearning) {
      // Reinforce existing learning
      resultLearning = reinforceLearning(
        matchingLearning.id,
        body.resolveId,
        `Accepted suggestion: "${acceptedSuggestion.title}"`,
      )
    } else if (acceptedSuggestion.sourceLearningId) {
      // Reinforce the source learning
      resultLearning = reinforceLearning(
        acceptedSuggestion.sourceLearningId,
        body.resolveId,
        `Accepted suggestion: "${acceptedSuggestion.title}"`,
      )
    } else {
      // Create new learning from suggestion
      resultLearning = createLearning({
        category: acceptedSuggestion.category,
        content: acceptedSuggestion.explanation,
        confidence: 0.5,
        tags: acceptedSuggestion.tags,
        sourceTicketId: body.resolveId,
      })
    }

    // Apply reinforcements from Claude's analysis
    for (const id of reinforceIds) {
      if (id !== resultLearning?.id) {
        reinforceLearning(id, body.resolveId, `Confirmed by related ticket analysis`)
      }
    }

    // Apply contradictions from Claude's analysis
    for (const id of contradictIds) {
      contradictLearning(id, body.resolveId, `Contradicted by ticket analysis`)
    }

    return NextResponse.json({ learning: resultLearning })
  } catch (err) {
    console.error('/api/feedback error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
