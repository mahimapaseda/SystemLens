import type { IpcMain } from 'electron'
import { getBatteryInfo } from './collectors/battery'
import { getThermalInfo } from './collectors/thermal'
import { getDiskInfo } from './collectors/disk'
import { getCpuRamInfo } from './collectors/cpu-ram'
import { getAudioInfo } from './collectors/audio'
import { getNetworkInfo } from './collectors/network'
import { getDisplayInfo } from './collectors/display'
import { getHistoryData, isFirstDiagnosis } from './database'
import { cached, TTL, computeAndPersistHealthScore, runFirstDiagnosis } from './health-service'
import { runSpeedTest } from './collectors/speed-test'

export function registerIpcHandlers(ipcMain: IpcMain): void {

  ipcMain.handle('setup:status', () => {
    return { success: true, data: { needsDiagnosis: isFirstDiagnosis() } }
  })

  ipcMain.handle('setup:diagnose', async (event) => {
    try {
      const data = await runFirstDiagnosis((progress) => {
        event.sender.send('setup:progress', progress)
      })
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('battery:get', async () => {
    try {
      const data = await cached('battery', TTL.battery, getBatteryInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('thermal:get', async () => {
    try {
      const data = await cached('thermal', TTL.thermal, getThermalInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('disk:get', async () => {
    try {
      const data = await cached('disk', TTL.disk, getDiskInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('cpuram:get', async () => {
    try {
      const data = await cached('cpuram', TTL.cpuram, getCpuRamInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('audio:get', async () => {
    try {
      const data = await cached('audio', TTL.audio, getAudioInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('network:get', async () => {
    try {
      const data = await cached('network', TTL.network, getNetworkInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('network:speedTest', async () => {
    try {
      const data = await runSpeedTest()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('display:get', async () => {
    try {
      const data = await cached('display', TTL.display, getDisplayInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('health:score', async () => {
    try {
      const data = await computeAndPersistHealthScore()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('history:get', (_event, days: number = 7) => {
    try {
      return { success: true, data: getHistoryData(days) }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
