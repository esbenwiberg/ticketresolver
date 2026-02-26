import { NextResponse } from 'next/server'
import { getRepoConfigs } from '@/lib/store'

export async function GET() {
  const repos = getRepoConfigs()
  return NextResponse.json({ repos })
}
