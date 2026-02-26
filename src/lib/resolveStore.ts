// In-memory tracking of resolve metadata for feedback correlation
export const resolveStore = new Map<string, { reinforceIds: string[]; contradictIds: string[] }>()
