/**
 * Format bytes into human-readable string
 * e.g. 1073741824 → "1.0 GB"
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * Format a duration in minutes to "Xh Ym" or "Ym"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return 'Unknown'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/**
 * Get a color string based on a health score (0-100)
 */
export function scoreToColor(score: number): string {
  if (score >= 85) return 'var(--color-accent-green)'
  if (score >= 70) return 'var(--color-accent-blue)'
  if (score >= 55) return 'var(--color-accent-amber)'
  if (score >= 40) return '#f97316'
  return 'var(--color-accent-red)'
}

/**
 * Get a grade letter for a health score
 */
export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}
