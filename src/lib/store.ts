import { Learning, LearningEvent, MockTicket, RepoConfig } from './types'
import { readFileSync } from 'fs'
import { join } from 'path'

function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function makeEvent(type: LearningEvent['type'], evidence: string, ticketId?: string): LearningEvent {
  return {
    id: generateId(),
    type,
    evidence,
    ticketId,
    createdAt: new Date(),
  }
}

// ── Mock Ticket DB ────────────────────────────────────────────────────────────

const MOCK_TICKETS: MockTicket[] = [
  {
    id: 'ticket-001',
    title: 'Login fails after password reset',
    description: 'Users report they cannot log in after resetting their password. The login page shows "invalid credentials" even with the new password.',
    resolution: 'Clear session cookies and invalidate Redis cache entries for affected users. The old session token was persisting after password reset.',
    category: 'auth',
    tags: ['login', 'session', 'password', 'redis', 'cache'],
  },
  {
    id: 'ticket-002',
    title: '502 Bad Gateway on /api/upload',
    description: 'Upload endpoint returns 502 Bad Gateway for files larger than ~5MB. Smaller uploads work fine.',
    resolution: 'Increase nginx proxy_read_timeout to 120s and proxy_send_timeout to 120s in nginx.conf.',
    category: 'config',
    tags: ['nginx', '502', 'upload', 'timeout', 'gateway'],
  },
  {
    id: 'ticket-003',
    title: 'Database connection pool exhausted',
    description: 'Application logs show "connection pool exhausted" errors under load. Service becomes unresponsive after ~200 concurrent users.',
    resolution: 'Increase pool size from 10 to 50 in database config. Add connection retry logic with exponential backoff.',
    category: 'performance',
    tags: ['database', 'connection', 'pool', 'performance', 'postgresql'],
  },
  {
    id: 'ticket-004',
    title: 'JWT token expired immediately after login',
    description: 'Tokens generated at login are immediately reported as expired. Issue appeared after server migration.',
    resolution: 'Check server clock sync — NTP drift was causing 15-minute skew. Run ntpdate to sync and configure chronyd for automatic correction.',
    category: 'auth',
    tags: ['jwt', 'token', 'ntp', 'clock', 'expiry'],
  },
  {
    id: 'ticket-005',
    title: 'Email notifications not sending',
    description: 'Transactional emails stopped being delivered. SMTP errors in logs: "535 Authentication Credentials Invalid".',
    resolution: 'SMTP credentials were rotated. Update EMAIL_PASSWORD env var in production secrets manager and restart the notification service.',
    category: 'config',
    tags: ['email', 'smtp', 'credentials', 'env', 'notifications'],
  },
  {
    id: 'ticket-006',
    title: 'Build fails on CI but passes locally',
    description: 'CI pipeline fails with "Cannot find module" errors. Same code builds fine on developer machines.',
    resolution: 'Node version mismatch between local (v18) and CI (v16). Pin node version in .nvmrc and update CI pipeline to use node 18.',
    category: 'deployment',
    tags: ['ci', 'build', 'node', 'version', 'nvmrc'],
  },
  {
    id: 'ticket-007',
    title: 'Memory leak in worker process',
    description: 'Worker service memory grows continuously and requires daily restarts. RSS climbs ~50MB/hour.',
    resolution: 'Event listener not removed on component unmount. Added cleanup in useEffect return function and removed duplicate event subscriptions.',
    category: 'bug',
    tags: ['memory', 'leak', 'event-listener', 'cleanup', 'worker'],
  },
  {
    id: 'ticket-008',
    title: 'Deployment rollback triggered automatically',
    description: 'New deployment failed health checks and auto-rolled back. Error: "Application failed to start — missing required config".',
    resolution: 'Missing DATABASE_URL env var in production. Add to secret manager and ensure deployment pipeline injects it before container startup.',
    category: 'deployment',
    tags: ['deployment', 'env', 'database-url', 'health-check', 'secrets'],
  },
  {
    id: 'ticket-009',
    title: 'High CPU usage on API server',
    description: 'API server CPU pegged at 100% during business hours. Response times degraded from 50ms to 8s.',
    resolution: 'Unindexed query scanning full table on every request. Added composite index on (user_id, created_at). CPU dropped to 15%.',
    category: 'performance',
    tags: ['cpu', 'performance', 'database', 'index', 'query'],
  },
  {
    id: 'ticket-010',
    title: 'CORS errors in production after CDN switch',
    description: 'Frontend getting CORS errors on API calls after migrating to new CDN. Works in staging.',
    resolution: 'CDN was stripping the Origin header. Updated CDN policy to forward Origin and updated CORS allowed origins list to include new domain.',
    category: 'network',
    tags: ['cors', 'cdn', 'network', 'headers', 'origin'],
  },
  {
    id: 'ticket-011',
    title: 'Password reset emails link expired',
    description: 'Users click password reset link and see "token expired or invalid". Reported by users in US-East only.',
    resolution: 'Reset token TTL was 1 hour but email delivery to US-East was delayed 2+ hours. Extended TTL to 24 hours and added delivery monitoring.',
    category: 'auth',
    tags: ['password-reset', 'token', 'ttl', 'email', 'expiry'],
  },
  {
    id: 'ticket-012',
    title: 'Websocket connections dropping every 60 seconds',
    description: 'Real-time features broken. Connections drop exactly at 60s. Client reconnects but users see missed events.',
    resolution: 'Load balancer idle timeout set to 60s. Updated ALB idle timeout to 300s and added WebSocket ping/pong keep-alive every 30s.',
    category: 'network',
    tags: ['websocket', 'load-balancer', 'timeout', 'alb', 'keepalive'],
  },
  {
    id: 'ticket-013',
    title: 'Search returning stale results',
    description: 'Search index showing results from 3 days ago. New documents not appearing in search.',
    resolution: 'Elasticsearch index refresh interval was manually set to -1 (disabled) during a performance test. Reset to default 1s refresh interval.',
    category: 'bug',
    tags: ['search', 'elasticsearch', 'index', 'refresh', 'stale'],
  },
  {
    id: 'ticket-014',
    title: 'OAuth callback returns 500 error',
    description: 'GitHub OAuth login broken. Users redirected to /auth/callback but see 500 error. Regular login works.',
    resolution: 'GITHUB_CLIENT_SECRET env var not set in production. Added to secrets manager. Also updated callback URL in GitHub OAuth app settings.',
    category: 'auth',
    tags: ['oauth', 'github', 'callback', 'env', 'secret'],
  },
  {
    id: 'ticket-015',
    title: 'Scheduled jobs not running in production',
    description: 'Cron jobs that run fine locally and in staging never execute in production. No errors in logs.',
    resolution: 'Production deployment uses multiple replicas — all replicas were trying to claim jobs. Added distributed lock with Redis to ensure single execution.',
    category: 'deployment',
    tags: ['cron', 'scheduler', 'redis', 'distributed-lock', 'replicas'],
  },
]

// ── Seed Learnings ────────────────────────────────────────────────────────────

function createSeedLearning(
  id: string,
  category: string,
  content: string,
  confidence: number,
  tags: string[],
  sourceTicketIds: string[],
): Learning {
  return {
    id,
    category,
    content,
    confidence,
    tags,
    reinforcements: 2,
    contradictions: 0,
    sourceTicketIds,
    lastUsedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    dismissedAt: null,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    events: [
      makeEvent('created', 'Seeded from resolved incident', sourceTicketIds[0]),
      makeEvent('reinforced', 'Confirmed by similar incident', sourceTicketIds[0]),
    ],
  }
}

const seedLearnings: Learning[] = [
  createSeedLearning(
    'learn-001',
    'auth',
    'When login fails after a password reset, invalidate all active sessions and clear Redis cache entries for that user. Stale session tokens survive password changes and must be explicitly revoked.',
    0.85,
    ['login', 'session', 'password-reset', 'redis'],
    ['ticket-001'],
  ),
  createSeedLearning(
    'learn-002',
    'config',
    'SMTP "535 Authentication Credentials Invalid" errors after a working period indicate rotated credentials. Check the email service account in secrets manager and update EMAIL_PASSWORD before restarting the notification service.',
    0.80,
    ['email', 'smtp', 'credentials', 'env'],
    ['ticket-005'],
  ),
  createSeedLearning(
    'learn-003',
    'performance',
    'Connection pool exhaustion under moderate load usually means the pool size is too small or connections are not being released. Increase pool size and add connection retry with exponential backoff.',
    0.75,
    ['database', 'connection-pool', 'performance'],
    ['ticket-003'],
  ),
  createSeedLearning(
    'learn-004',
    'deployment',
    'CI build failures due to missing modules that work locally are almost always a Node.js version mismatch. Pin the version in .nvmrc and align CI pipeline to match.',
    0.88,
    ['ci', 'node-version', 'build', 'nvmrc'],
    ['ticket-006'],
  ),
  createSeedLearning(
    'learn-005',
    'network',
    'WebSocket connections dropping at a fixed interval point to a load balancer idle timeout. Increase ALB/nginx idle timeout and add client-side ping/pong keep-alive at half the timeout interval.',
    0.78,
    ['websocket', 'load-balancer', 'timeout', 'keepalive'],
    ['ticket-012'],
  ),
]

// ── In-Memory State ───────────────────────────────────────────────────────────

let learnings: Learning[] = [...seedLearnings]

// ── CRUD Operations ───────────────────────────────────────────────────────────

export interface LearningFilters {
  category?: string
  minConfidence?: number
  showDismissed?: boolean
  page?: number
  limit?: number
}

export function getLearnings(filters: LearningFilters = {}): { learnings: Learning[]; total: number } {
  let filtered = learnings

  if (filters.category) {
    filtered = filtered.filter((l) => l.category === filters.category)
  }
  if (filters.minConfidence !== undefined) {
    filtered = filtered.filter((l) => l.confidence >= filters.minConfidence!)
  }
  if (!filters.showDismissed) {
    filtered = filtered.filter((l) => l.dismissedAt === null)
  }

  const total = filtered.length
  const page = filters.page ?? 1
  const limit = filters.limit ?? 50
  const start = (page - 1) * limit
  filtered = filtered.slice(start, start + limit)

  return { learnings: filtered, total }
}

export function getLearningById(id: string): Learning | null {
  return learnings.find((l) => l.id === id) ?? null
}

export function createLearning(data: {
  category: string
  content: string
  confidence: number
  tags: string[]
  sourceTicketId?: string
}): Learning {
  const id = 'learn-' + generateId()
  const event = makeEvent('created', 'Created from accepted suggestion', data.sourceTicketId)
  const learning: Learning = {
    id,
    category: data.category,
    content: data.content,
    confidence: data.confidence,
    tags: data.tags,
    reinforcements: 1,
    contradictions: 0,
    sourceTicketIds: data.sourceTicketId ? [data.sourceTicketId] : [],
    lastUsedAt: new Date(),
    dismissedAt: null,
    createdAt: new Date(),
    events: [event],
  }
  learnings.push(learning)
  return learning
}

export function reinforceLearning(id: string, ticketId: string | undefined, evidence: string): Learning | null {
  const learning = learnings.find((l) => l.id === id)
  if (!learning) return null

  learning.reinforcements += 1
  learning.confidence = Math.min(0.99, learning.confidence + 0.05)
  learning.lastUsedAt = new Date()
  if (ticketId && !learning.sourceTicketIds.includes(ticketId)) {
    learning.sourceTicketIds.push(ticketId)
  }
  learning.events.push(makeEvent('reinforced', evidence, ticketId))
  return learning
}

export function contradictLearning(id: string, ticketId: string | undefined, evidence: string): Learning | null {
  const learning = learnings.find((l) => l.id === id)
  if (!learning) return null

  learning.contradictions += 1
  learning.confidence = Math.max(0.0, learning.confidence - 0.05)
  if (ticketId && !learning.sourceTicketIds.includes(ticketId)) {
    learning.sourceTicketIds.push(ticketId)
  }
  learning.events.push(makeEvent('contradicted', evidence, ticketId))
  return learning
}

export function dismissLearning(id: string): Learning | null {
  const learning = learnings.find((l) => l.id === id)
  if (!learning) return null

  learning.dismissedAt = new Date()
  learning.events.push(makeEvent('dismissed', 'Manually dismissed by operator'))
  return learning
}

export function searchMockTickets(query: string): MockTicket[] {
  const queryLower = query.toLowerCase()
  const words = queryLower.split(/\s+/).filter((w) => w.length > 2)

  const scored = MOCK_TICKETS.map((ticket) => {
    const text = `${ticket.title} ${ticket.description} ${ticket.tags.join(' ')}`.toLowerCase()
    const score = words.reduce((acc, word) => {
      const occurrences = (text.match(new RegExp(word, 'g')) ?? []).length
      return acc + occurrences
    }, 0)
    return { ticket, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.ticket)
}

export function getActiveLearnings(): Learning[] {
  return learnings.filter((l) => l.dismissedAt === null)
}

export function getLearningsStats() {
  const active = learnings.filter((l) => l.dismissedAt === null)
  const dismissed = learnings.filter((l) => l.dismissedAt !== null)
  const avgConfidence = active.length > 0 ? active.reduce((s, l) => s + l.confidence, 0) / active.length : 0
  return {
    totalCount: learnings.length,
    activeCount: active.length,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    dismissedCount: dismissed.length,
  }
}

export function getRepoConfigs(): RepoConfig[] {
  try {
    const path = join(process.cwd(), 'repos.json')
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as RepoConfig[]
  } catch {
    return []
  }
}
