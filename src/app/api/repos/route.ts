import { NextResponse } from 'next/server'
import { getRepoConfigs } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const repos = getRepoConfigs()
  return NextResponse.json({ repos })
}
