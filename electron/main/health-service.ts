import { getBatteryInfo } from './collectors/battery'
import { getThermalInfo } from './collectors/thermal'
import { getDiskInfo } from './collectors/disk'
import { getCpuRamInfo } from './collectors/cpu-ram'
import { getAudioInfo } from './collectors/audio'
import { getNetworkInfo } from './collectors/network'
import { getDisplayInfo } from './collectors/display'
import { getOverallHealthScore, type OverallHealthScore } from './collectors/health-score'
import { markDiagnosisComplete, saveSnapshot } from './database'
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

export interface DiagnosisProgress {
  step: string
  label: string
  done: boolean
}

const DIAGNOSIS_STEPS: { step: string; label: string; run: () => Promise<unknown> }[] = [
  { step: 'battery', label: 'Battery', run: getBatteryInfo },
  { step: 'thermal', label: 'Thermal', run: getThermalInfo },
  { step: 'disk', label: 'Storage', run: getDiskInfo },
  { step: 'cpuram', label: 'CPU & RAM', run: getCpuRamInfo },
  { step: 'network', label: 'Network', run: getNetworkInfo },
  { step: 'audio', label: 'Audio', run: getAudioInfo },
  { step: 'display', label: 'Display', run: getDisplayInfo }
]

/**
 * First launch only: scan modules one by one, cache results, save the first snapshot.
 */
export async function runFirstDiagnosis(
  onStep: (progress: DiagnosisProgress) => void
): Promise<OverallHealthScore> {
  const collected: Record<string, unknown> = {}

  for (const step of DIAGNOSIS_STEPS) {
    onStep({ step: step.step, label: step.label, done: false })
    const data = await step.run()
    setCached(step.step, data)
    collected[step.step] = data
    onStep({ step: step.step, label: step.label, done: true })
  }

  const score = getOverallHealthScore({
    battery: collected.battery,
    thermal: collected.thermal,
    disk: collected.disk,
    cpuram: collected.cpuram,
    network: collected.network,
    audio: collected.audio,
    display: collected.display
  } as Parameters<typeof getOverallHealthScore>[0])

  setCached('score', score)
  saveSnapshot(score)
  updateTrayHealthTooltip(score.overall, score.grade)
  markDiagnosisComplete()
  return score
}
