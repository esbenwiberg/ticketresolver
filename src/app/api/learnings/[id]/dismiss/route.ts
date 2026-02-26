import { NextRequest, NextResponse } from 'next/server'
import { dismissLearning } from '@/lib/store'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const learning = dismissLearning(params.id)
  if (!learning) {
    return NextResponse.json({ error: 'Learning not found' }, { status: 404 })
  }
  return NextResponse.json({ learning })
}
