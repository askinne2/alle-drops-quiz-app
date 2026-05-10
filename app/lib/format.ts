export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

export function formatAnswerValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ')
  if (val !== null && typeof val === 'object') return JSON.stringify(val)
  return String(val ?? '—')
}
