import cron from 'node-cron'
import { computeAndPersistHealthScore } from './health-service'

let started = false

/** Every 15 minutes while the app runs (including tray-only). */
export function startHealthScheduler(): void {
  if (started) return
  started = true

  cron.schedule('*/15 * * * *', () => {
    computeAndPersistHealthScore().catch((err) => {
      console.error('[SystemLens] Scheduled health check failed:', err)
    })
  })

  // Initial background sample shortly after launch (tray tooltip + history)
  setTimeout(() => {
    computeAndPersistHealthScore().catch((err) => {
      console.error('[SystemLens] Initial health check failed:', err)
    })
  }, 8_000)
}
