import { Notification } from 'electron'
import type { OverallHealthScore } from './collectors/health-score'

const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes per alert type

const lastFired = new Map<string, number>()

function canFire(key: string): boolean {
  const last = lastFired.get(key) ?? 0
  if (Date.now() - last < COOLDOWN_MS) return false
  lastFired.set(key, Date.now())
  return true
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body }).show()
}

/**
 * Fire Windows notifications when health crosses attention thresholds.
 * Fixed thresholds; 30-minute cooldown per alert type.
 */
export function maybeNotifyHealthAlerts(score: OverallHealthScore): void {
  if (score.overall < 55 && canFire('overall-low')) {
    notify(
      'SystemLens — Health needs attention',
      `Overall score is ${score.overall} (Grade ${score.grade}). Open SystemLens for recommendations.`
    )
  }

  if (
    (score.cpuTempSource === 'package' || score.cpuTempSource === 'ohm') &&
    score.cpuTemp > 90 &&
    canFire('thermal-hot')
  ) {
    notify(
      'SystemLens — High temperature',
      `CPU temperature is ${score.cpuTemp.toFixed(1)}°C. Check cooling and airflow.`
    )
  }

  if (score.diskHealth === 'Bad' && canFire('disk-bad')) {
    notify(
      'SystemLens — Disk failure risk',
      'A drive reported Bad health. Back up your data immediately.'
    )
  }
}
