import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'

// Pure-JS JSON file database — no native compilation required
// Replaces better-sqlite3 for cross-platform compatibility

interface HealthSnapshot {
  id: number
  timestamp: string
  overall_score: number
  battery_score: number
  thermal_score: number
  disk_score: number
  cpuram_score: number
  network_score: number
  battery_health_percent: number
  battery_level: number
  cpu_temp: number
  disk_health: string
  ram_used_percent: number
}

interface DbSchema {
  snapshots: HealthSnapshot[]
  nextId: number
}

const SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const SNAPSHOT_SCORE_DELTA = 3

let dbPath: string
let cache: DbSchema | null = null
let lastSavedAt = 0
let lastSavedOverall: number | null = null

function getDb(): DbSchema {
  if (cache) return cache
  if (existsSync(dbPath)) {
    try {
      cache = JSON.parse(readFileSync(dbPath, 'utf8')) as DbSchema
    } catch {
      cache = { snapshots: [], nextId: 1 }
    }
  } else {
    cache = { snapshots: [], nextId: 1 }
  }
  return cache
}

function saveDb(): void {
  if (!cache || !dbPath) return
  // Keep only last 1000 snapshots to prevent file bloat
  if (cache.snapshots.length > 1000) {
    cache.snapshots = cache.snapshots.slice(-1000)
  }
  writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf8')
}

export function initDatabase(): void {
  const dbDir = join(app.getPath('userData'), 'systemlens')
  mkdirSync(dbDir, { recursive: true })
  dbPath = join(dbDir, 'health.json')
  // Pre-load cache
  getDb()
  console.log(`[SystemLens DB] Initialized at ${dbPath}`)
}

function shouldSaveSnapshot(overall: number): boolean {
  const now = Date.now()
  if (lastSavedOverall === null) return true
  if (now - lastSavedAt >= SNAPSHOT_MIN_INTERVAL_MS) return true
  if (Math.abs(overall - lastSavedOverall) >= SNAPSHOT_SCORE_DELTA) return true
  return false
}

/** Persist a health snapshot at most every 5 minutes, or when overall score moves by ≥3. */
export function saveSnapshot(score: {
  overall: number
  battery: number
  thermal: number
  disk: number
  cpuram: number
  network: number
  batteryHealthPercent?: number
  batteryLevel?: number
  cpuTemp?: number
  diskHealth?: string
  ramUsedPercent?: number
}): boolean {
  if (!shouldSaveSnapshot(score.overall)) return false

  const db = getDb()
  const snapshot: HealthSnapshot = {
    id: db.nextId++,
    timestamp: new Date().toISOString(),
    overall_score: score.overall,
    battery_score: score.battery,
    thermal_score: score.thermal,
    disk_score: score.disk,
    cpuram_score: score.cpuram,
    network_score: score.network,
    battery_health_percent: score.batteryHealthPercent ?? 0,
    battery_level: score.batteryLevel ?? 0,
    cpu_temp: score.cpuTemp ?? 0,
    disk_health: score.diskHealth ?? 'Unknown',
    ram_used_percent: score.ramUsedPercent ?? 0
  }
  db.snapshots.push(snapshot)
  saveDb()
  lastSavedAt = Date.now()
  lastSavedOverall = score.overall
  return true
}

export function getHistoryData(days: number): HealthSnapshot[] {
  const db = getDb()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return db.snapshots.filter((s) => new Date(s.timestamp) >= cutoff)
}

/** Reset throttle state (for unit tests). */
export function _resetSnapshotThrottleForTests(): void {
  lastSavedAt = 0
  lastSavedOverall = null
}
