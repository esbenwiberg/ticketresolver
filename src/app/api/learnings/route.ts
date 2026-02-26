import { NextRequest, NextResponse } from 'next/server'
import { getLearnings, getLearningsStats } from '@/lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const category = searchParams.get('category') ?? undefined
  const minConfidence = searchParams.has('minConfidence')
    ? parseFloat(searchParams.get('minConfidence')!)
    : undefined
  const showDismissed = searchParams.get('dismissed') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '50', 10)

  const { learnings, total } = getLearnings({
    category,
    minConfidence,
    showDismissed,
    page,
    limit,
  })

  const stats = getLearningsStats()

  return NextResponse.json({ learnings, total, stats })
}
