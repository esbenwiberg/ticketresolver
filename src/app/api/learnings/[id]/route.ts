import { NextRequest, NextResponse } from 'next/server'
import { getLearningById } from '@/lib/store'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const learning = getLearningById(params.id)
  if (!learning) {
    return NextResponse.json({ error: 'Learning not found' }, { status: 404 })
  }
  return NextResponse.json({ learning })
}
