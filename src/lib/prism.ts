const PRISM_URL = process.env.PRISM_URL ?? 'http://localhost:3100'
const PRISM_API_KEY = process.env.PRISM_API_KEY ?? ''

export async function searchPrism(slug: string, query: string, maxResults = 8): Promise<string> {
  if (!slug) return ''

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (PRISM_API_KEY) {
      headers['Authorization'] = `Bearer ${PRISM_API_KEY}`
    }

    // slug is "owner/repo" — keep the slash unencoded for the path segments
    const [owner, repo] = slug.split('/')
    if (!owner || !repo) {
      console.warn(`Invalid Prism slug format "${slug}" — expected "owner/repo"`)
      return ''
    }

    const res = await fetch(`${PRISM_URL}/api/projects/${owner}/${repo}/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, maxResults, maxSummaries: maxResults }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.warn(`Prism search returned ${res.status} for slug "${slug}"`)
      return ''
    }

    const data = await res.json() as {
      relevantCode?: { filePath: string; symbolName?: string; symbolKind?: string; summary?: string; score?: number }[]
      moduleSummaries?: { targetId: string; content: string }[]
      findings?: { severity: string; title: string; description: string; suggestion?: string | null }[]
    }

    const lines: string[] = [`Prism codebase search results for: "${query}"`, '']

    // Relevant code symbols
    if (Array.isArray(data.relevantCode) && data.relevantCode.length > 0) {
      for (const r of data.relevantCode.slice(0, maxResults)) {
        const name = r.symbolName ? `${r.filePath} → ${r.symbolName} (${r.symbolKind ?? 'symbol'})` : r.filePath
        lines.push(`Code: ${name}`)
        if (r.summary) lines.push(`Summary: ${r.summary}`)
        if (r.score !== undefined) lines.push(`Relevance: ${Math.round(r.score * 100)}%`)
        lines.push('---')
      }
    }

    // Module summaries
    if (Array.isArray(data.moduleSummaries) && data.moduleSummaries.length > 0) {
      for (const s of data.moduleSummaries.slice(0, 3)) {
        lines.push(`Module: ${s.targetId}`)
        lines.push(`Summary: ${s.content}`)
        lines.push('---')
      }
    }

    // High-severity findings
    if (Array.isArray(data.findings) && data.findings.length > 0) {
      const important = data.findings.filter((f) => f.severity === 'critical' || f.severity === 'high')
      for (const f of important.slice(0, 3)) {
        lines.push(`Finding [${f.severity}]: ${f.title}`)
        lines.push(`Detail: ${f.description}`)
        if (f.suggestion) lines.push(`Suggestion: ${f.suggestion}`)
        lines.push('---')
      }
    }

    return lines.length > 2 ? lines.join('\n') : ''
  } catch (err) {
    console.warn('Prism search failed:', err instanceof Error ? err.message : err)
    return ''
  }
}
