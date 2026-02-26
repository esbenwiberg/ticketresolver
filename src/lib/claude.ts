import Anthropic from '@anthropic-ai/sdk'
import { Learning, MockTicket, Suggestion } from './types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ClaudeResponse {
  suggestions: Suggestion[]
  reinforceIds: string[]
  contradictIds: string[]
}

const SYSTEM_PROMPT = `You are an expert software engineer analyzing customer support tickets to suggest fixes.

Given a ticket description plus optional context (codebase search results, similar resolved tickets, existing knowledge base learnings), generate 1–3 actionable fix suggestions.

Return ONLY valid JSON in this exact schema:
{
  "suggestions": [
    {
      "id": "<unique-short-id>",
      "title": "<concise fix title, max 10 words>",
      "explanation": "<2-4 sentence actionable explanation of the fix>",
      "confidence": <number 0.4–0.95>,
      "category": "<one of: bug|config|auth|performance|deployment|network|other>",
      "tags": ["<tag1>", "<tag2>", ...],
      "sourceLearningId": "<id of relevant learning if applicable, else omit>"
    }
  ],
  "reinforceIds": ["<learning id that this ticket confirms>", ...],
  "contradictIds": ["<learning id that this ticket contradicts>", ...]
}

Guidelines:
- Provide 1 suggestion for simple/clear tickets, up to 3 for complex/ambiguous ones
- Confidence: 0.85–0.95 = strong evidence, 0.65–0.84 = moderate, 0.4–0.64 = speculative
- Tags should be lowercase kebab-case, 2–5 tags per suggestion
- Do NOT suggest solutions semantically equivalent to dismissed learnings
- If a learning directly addresses the issue, reference it with sourceLearningId and boost confidence
- reinforceIds: list learning IDs that this ticket provides evidence FOR
- contradictIds: list learning IDs that this ticket provides evidence AGAINST
- Be specific and actionable, not generic`

export async function generateSuggestions(
  ticketText: string,
  prismContext: string,
  similarTickets: MockTicket[],
  relevantLearnings: Learning[],
  screenshotBase64?: string,
): Promise<ClaudeResponse> {
  const contextParts: string[] = []

  if (prismContext) {
    contextParts.push(`=== CODEBASE CONTEXT ===\n${prismContext}`)
  }

  if (similarTickets.length > 0) {
    const ticketSummaries = similarTickets
      .map(
        (t) =>
          `Ticket: ${t.title}\nDescription: ${t.description}\nResolution: ${t.resolution}\nCategory: ${t.category}`,
      )
      .join('\n\n')
    contextParts.push(`=== SIMILAR RESOLVED TICKETS ===\n${ticketSummaries}`)
  }

  if (relevantLearnings.length > 0) {
    const learningSummaries = relevantLearnings
      .map(
        (l) =>
          `Learning ID: ${l.id}\nCategory: ${l.category}\nContent: ${l.content}\nConfidence: ${l.confidence}\nTags: ${l.tags.join(', ')}${l.dismissedAt ? '\nStatus: DISMISSED (do not suggest this)' : ''}`,
      )
      .join('\n\n')
    contextParts.push(`=== EXISTING KNOWLEDGE BASE ===\n${learningSummaries}`)
  }

  const context = contextParts.length > 0 ? '\n\n' + contextParts.join('\n\n') : ''

  const userContent: Anthropic.MessageParam['content'] = []

  if (screenshotBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: screenshotBase64,
      },
    })
  }

  userContent.push({
    type: 'text',
    text: `=== TICKET ===\n${ticketText}${context}\n\nGenerate fix suggestions as JSON:`,
  })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  const text = response.content.find((c) => c.type === 'text')?.text ?? ''

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  const jsonText = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : text

  try {
    const parsed = JSON.parse(jsonText.trim()) as ClaudeResponse
    // Ensure IDs are set
    parsed.suggestions = (parsed.suggestions ?? []).map((s, i) => ({
      ...s,
      id: s.id || `sug-${Date.now()}-${i}`,
    }))
    parsed.reinforceIds = parsed.reinforceIds ?? []
    parsed.contradictIds = parsed.contradictIds ?? []
    return parsed
  } catch {
    // Fallback: return a single generic suggestion
    return {
      suggestions: [
        {
          id: `sug-fallback-${Date.now()}`,
          title: 'Review application logs and configuration',
          explanation:
            'Unable to generate specific suggestions. Check recent application logs for error messages and verify all environment variables and configuration are correct for the affected service.',
          confidence: 0.4,
          category: 'other',
          tags: ['troubleshooting', 'logs', 'config'],
        },
      ],
      reinforceIds: [],
      contradictIds: [],
    }
  }
}
