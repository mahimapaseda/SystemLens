import { getBatteryInfo } from './collectors/battery'
import { getThermalInfo } from './collectors/thermal'
import { getDiskInfo } from './collectors/disk'
import { getCpuRamInfo } from './collectors/cpu-ram'
import { getAudioInfo } from './collectors/audio'
import { getNetworkInfo } from './collectors/network'
import { getDisplayInfo } from './collectors/display'
import { getOverallHealthScore, type OverallHealthScore } from './collectors/health-score'
import { saveSnapshot } from './database'
import { getCached, setCached } from './data-cache'
import { updateTrayHealthTooltip } from './tray-state'
import { maybeNotifyHealthAlerts } from './notifications'

export const TTL = {
  battery: 10_000,
  thermal: 8_000,
  disk: 30_000,
  cpuram: 6_000,
  audio: 60_000,
  network: 12_000,
  display: 60_000,
  score: 12_000
}

export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key, ttl)
  if (hit !== null) return hit
  const data = await fn()
  setCached(key, data)
  return data
}

async function computeScore(): Promise<OverallHealthScore> {
  const [battery, thermal, disk, cpuram, network, audio, display] = await Promise.all([
    cached('battery', TTL.battery, getBatteryInfo),
    cached('thermal', TTL.thermal, getThermalInfo),
    cached('disk', TTL.disk, getDiskInfo),
    cached('cpuram', TTL.cpuram, getCpuRamInfo),
    cached('network', TTL.network, getNetworkInfo),
    cached('audio', TTL.audio, getAudioInfo),
    cached('display', TTL.display, getDisplayInfo)
  ])
  return getOverallHealthScore({ battery, thermal, disk, cpuram, network, audio, display })
}

/**
 * Compute (or reuse cached) overall health, throttle-persist, update tray, notify.
 * Shared by IPC health:score and the 15-minute background scheduler.
 */
export async function computeAndPersistHealthScore(): Promise<OverallHealthScore> {
  const data = await cached('score', TTL.score, computeScore)
  saveSnapshot(data)
  updateTrayHealthTooltip(data.overall, data.grade)
  maybeNotifyHealthAlerts(data)
  return data
}
