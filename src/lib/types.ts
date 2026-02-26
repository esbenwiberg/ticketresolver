export interface LearningEvent {
  id: string
  type: 'created' | 'reinforced' | 'contradicted' | 'dismissed'
  evidence: string
  ticketId?: string
  createdAt: Date
}

export interface Learning {
  id: string
  category: string
  content: string
  confidence: number
  tags: string[]
  reinforcements: number
  contradictions: number
  sourceTicketIds: string[]
  lastUsedAt: Date | null
  dismissedAt: Date | null
  createdAt: Date
  events: LearningEvent[]
}

export interface Suggestion {
  id: string
  title: string
  explanation: string
  confidence: number
  category: string
  tags: string[]
  sourceLearningId?: string
}

export interface MockTicket {
  id: string
  title: string
  description: string
  resolution: string
  category: string
  tags: string[]
}

export interface RepoConfig {
  slug: string
  name: string
}

export interface LearningsStats {
  totalCount: number
  activeCount: number
  avgConfidence: number
  dismissedCount: number
}
