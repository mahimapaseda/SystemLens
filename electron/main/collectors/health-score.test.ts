import { describe, it, expect } from 'vitest'
import { getOverallHealthScore } from './health-score'
import type { BatteryInfo } from './battery'
import type { ThermalInfo } from './thermal'
import type { DiskInfo } from './disk'
import type { CpuRamInfo } from './cpu-ram'
import type { NetworkInfo } from './network'
import type { AudioInfo } from './audio'
import type { DisplayInfo } from './display'

function baseBattery(over: Partial<BatteryInfo> = {}): BatteryInfo {
  return {
    hasBattery: true,
    isCharging: false,
    acConnected: false,
    percent: 80,
    timeRemaining: 120,
    designCapacity: 50000,
    fullChargeCapacity: 45000,
    healthPercent: 90,
    voltage: 12,
    chargingWatts: null,
    cycleCount: 100,
    manufacturer: 'Test',
    model: 'Bat',
    temperature: null,
    healthScore: 90,
    ...over
  }
}

function baseThermal(over: Partial<ThermalInfo> = {}): ThermalInfo {
  return {
    cpuTemp: 55,
    cpuTempPerCore: [],
    gpuTemp: null,
    maxTemp: 55,
    fanSpeeds: [],
    isThrottling: false,
    thermalScore: 100,
    sensorAvailable: true,
    zones: [],
    cpuTempSource: 'package',
    gpuTempSource: 'none',
    systemZoneTemp: null,
    ...over
  }
}

function baseDisk(over: Partial<DiskInfo> = {}): DiskInfo {
  return {
    drives: [
      {
        name: 'C:',
        type: 'SSD',
        size: 512e9,
        temperature: 35,
        healthStatus: 'Good',
        healthPercent: 95,
        smartPassed: true,
        reallocatedSectors: null,
        pendingSectors: null,
        uncorrectableErrors: null,
        wearLevel: null,
        readSpeed: null,
        writeSpeed: null,
        diskScore: 95
      }
    ],
    partitions: [{ fs: 'NTFS', mount: 'C:', size: 512e9, used: 100e9, usedPercent: 20 }],
    totalReadSpeed: null,
    totalWriteSpeed: null,
    overallDiskScore: 95,
    ...over
  }
}

function baseCpuRam(over: Partial<CpuRamInfo> = {}): CpuRamInfo {
  return {
    cpuBrand: 'Test CPU',
    cpuManufacturer: 'Test',
    physicalCores: 4,
    logicalCores: 8,
    baseSpeed: 2,
    currentSpeed: 2.5,
    maxSpeed: 4,
    coreUsage: [10, 10, 10, 10],
    totalUsage: 10,
    totalRam: 16e9,
    usedRam: 4e9,
    freeRam: 12e9,
    usedPercent: 25,
    ramSpeed: 3200,
    ramType: 'DDR4',
    ramSlots: [],
    cpuScore: 95,
    ramScore: 100,
    overallScore: 97,
    ...over
  }
}

function baseNetwork(over: Partial<NetworkInfo> = {}): NetworkInfo {
  return {
    wifiConnected: true,
    wifiSsid: 'Home',
    wifiSignalDb: -50,
    wifiSignalPercent: 80,
    wifiBand: '5GHz',
    wifiChannel: 36,
    wifiSecurity: 'WPA2',
    connectionType: 'wifi',
    downloadSpeed: 0,
    uploadSpeed: 0,
    pingMs: 20,
    adapters: [],
    networkScore: 90,
    ...over
  }
}

function baseAudio(over: Partial<AudioInfo> = {}): AudioInfo {
  return {
    devices: [
      {
        name: 'Speakers',
        type: 'Speaker',
        status: 'active',
        isDefault: true,
        manufacturer: 'Test',
        driver: '1.0'
      }
    ],
    audioScore: 90,
    ...over
  }
}

function baseDisplay(over: Partial<DisplayInfo> = {}): DisplayInfo {
  return {
    monitors: [
      {
        model: 'Panel',
        manufacturer: 'OEM',
        sizeInch: 15.6,
        resolutionX: 1920,
        resolutionY: 1080,
        refreshRate: 60,
        brightness: null,
        hdr: false,
        connection: 'Internal'
      }
    ],
    gpus: [{ name: 'GPU', vram: 4096, driverVersion: '1.0' }],
    displayScore: 90,
    ...over
  }
}

function allModules(over: {
  battery?: Partial<BatteryInfo>
  thermal?: Partial<ThermalInfo>
  disk?: Partial<DiskInfo>
  cpuram?: Partial<CpuRamInfo>
  network?: Partial<NetworkInfo>
  audio?: Partial<AudioInfo>
  display?: Partial<DisplayInfo>
} = {}) {
  return {
    battery: baseBattery(over.battery),
    thermal: baseThermal(over.thermal),
    disk: baseDisk(over.disk),
    cpuram: baseCpuRam(over.cpuram),
    network: baseNetwork(over.network),
    audio: baseAudio(over.audio),
    display: baseDisplay(over.display)
  }
}

describe('getOverallHealthScore', () => {
  it('returns grade A for healthy laptop', () => {
    const score = getOverallHealthScore(allModules())
    expect(score.overall).toBeGreaterThanOrEqual(85)
    expect(score.grade).toBe('A')
    expect(score.display).toBe(90)
    expect(score.recommendations[0]).toMatch(/excellent health/i)
  })

  it('includes display in returned scores', () => {
    const score = getOverallHealthScore(allModules({ display: { displayScore: 70 } }))
    expect(score.display).toBe(70)
  })

  it('redistributes battery weight when no battery', () => {
    const withBattery = getOverallHealthScore(allModules({ battery: { healthScore: 20, hasBattery: true } }))
    const noBattery = getOverallHealthScore(
      allModules({ battery: { hasBattery: false, healthScore: 20, healthPercent: null } })
    )
    expect(noBattery.overall).toBeGreaterThan(withBattery.overall)
  })

  it('recommends on low battery health', () => {
    const score = getOverallHealthScore(
      allModules({ battery: { healthPercent: 35, healthScore: 20 } })
    )
    expect(score.recommendations.some((r) => /battery health is critically low/i.test(r))).toBe(true)
  })

  it('recommends on high temperature', () => {
    const score = getOverallHealthScore(
      allModules({
        thermal: {
          maxTemp: 95,
          cpuTemp: 95,
          thermalScore: 5,
          isThrottling: true,
          sensorAvailable: true,
          cpuTempSource: 'package'
        }
      })
    )
    expect(score.recommendations.some((r) => /dangerously high/i.test(r))).toBe(true)
    expect(score.recommendations.some((r) => /throttling/i.test(r))).toBe(true)
    expect(score.cpuTempSource).toBe('package')
  })

  it('does not treat ACPI zone heat as CPU package alert', () => {
    const score = getOverallHealthScore(
      allModules({
        thermal: {
          cpuTemp: null,
          maxTemp: 95,
          systemZoneTemp: 95,
          thermalScore: 5,
          isThrottling: null,
          sensorAvailable: true,
          cpuTempSource: 'zone'
        }
      })
    )
    expect(score.recommendations.some((r) => /LibreHardwareMonitor/i.test(r))).toBe(true)
    expect(score.recommendations.some((r) => /CPU temperature is dangerously high/i.test(r))).toBe(false)
  })

  it('recommends on bad disk', () => {
    const score = getOverallHealthScore(
      allModules({
        disk: {
          drives: [
            {
              name: 'FailingSSD',
              type: 'SSD',
              size: 256e9,
              temperature: null,
              healthStatus: 'Bad',
              healthPercent: 20,
              smartPassed: false,
              reallocatedSectors: null,
              pendingSectors: null,
              uncorrectableErrors: null,
              wearLevel: null,
              readSpeed: null,
              writeSpeed: null,
              diskScore: 20
            }
          ],
          overallDiskScore: 20
        }
      })
    )
    expect(score.recommendations.some((r) => /FailingSSD/.test(r) && /failing/i.test(r))).toBe(true)
    expect(score.diskHealth).toBe('Bad')
  })

  it('assigns lower grades for poor overall', () => {
    const score = getOverallHealthScore(
      allModules({
        battery: { healthScore: 20, healthPercent: 30 },
        thermal: {
          thermalScore: 10,
          maxTemp: 95,
          cpuTemp: 95,
          sensorAvailable: true,
          cpuTempSource: 'package'
        },
        disk: { overallDiskScore: 20 },
        cpuram: { overallScore: 20, usedPercent: 90 },
        network: { networkScore: 30, connectionType: 'offline' },
        audio: { audioScore: 50 },
        display: { displayScore: 70 }
      })
    )
    expect(score.overall).toBeLessThan(55)
    expect(['D', 'F', 'C']).toContain(score.grade)
  })
})
