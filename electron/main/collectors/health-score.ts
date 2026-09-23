import type { BatteryInfo } from './battery'
import type { ThermalInfo } from './thermal'
import type { DiskInfo } from './disk'
import type { CpuRamInfo } from './cpu-ram'
import type { NetworkInfo } from './network'
import type { AudioInfo } from './audio'
import type { DisplayInfo } from './display'

interface AllModuleData {
  battery: BatteryInfo
  thermal: ThermalInfo
  disk: DiskInfo
  cpuram: CpuRamInfo
  network: NetworkInfo
  audio: AudioInfo
  display: DisplayInfo
}

export interface OverallHealthScore {
  overall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  battery: number
  thermal: number
  disk: number
  cpuram: number
  network: number
  audio: number
  display: number
  recommendations: string[]
  batteryHealthPercent: number
  batteryLevel: number
  cpuTemp: number
  cpuTempSource: ThermalInfo['cpuTempSource']
  diskHealth: string
  ramUsedPercent: number
}

export function getOverallHealthScore(data: AllModuleData): OverallHealthScore {
  const { battery, thermal, disk, cpuram, network, audio, display } = data

  const weights = {
    battery: battery.hasBattery ? 0.25 : 0,
    thermal: 0.20,
    disk: 0.25,
    cpuram: 0.15,
    network: 0.07,
    audio: 0.03,
    display: 0.05
  }

  // Redistribute battery weight when no battery (desktop)
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  const norm = (w: number) => w / weightSum

  const audioScore = audio.audioScore
  const displayScore = display.displayScore
  const overall = Math.round(
    battery.healthScore * norm(weights.battery) +
    thermal.thermalScore * norm(weights.thermal) +
    disk.overallDiskScore * norm(weights.disk) +
    cpuram.overallScore * norm(weights.cpuram) +
    network.networkScore * norm(weights.network) +
    audioScore * norm(weights.audio) +
    displayScore * norm(weights.display)
  )

  const grade: OverallHealthScore['grade'] =
    overall >= 85 ? 'A' :
    overall >= 70 ? 'B' :
    overall >= 55 ? 'C' :
    overall >= 40 ? 'D' : 'F'

  const recommendations: string[] = []

  if (battery.hasBattery && battery.healthPercent != null) {
    if (battery.healthPercent < 40) {
      recommendations.push('Battery health is critically low. Consider replacing the battery soon.')
    } else if (battery.healthPercent < 60) {
      recommendations.push('Battery health is declining. Monitor closely and plan for replacement.')
    }
  }

  if (thermal.cpuTempSource === 'none' || thermal.cpuTempSource === 'zone') {
    recommendations.push(
      'CPU package temperature is unavailable. Install LibreHardwareMonitor (with its WMI/server enabled) for accurate CPU temps.'
    )
  }

  if (!thermal.sensorAvailable) {
    recommendations.push('Thermal sensors are limited on this system. GPU/zone readings are used when available.')
  } else if (
    (thermal.cpuTempSource === 'package' || thermal.cpuTempSource === 'ohm') &&
    thermal.cpuTemp != null &&
    thermal.cpuTemp > 90
  ) {
    recommendations.push('CPU temperature is dangerously high. Clean cooling vents and check thermal paste.')
  } else if (
    (thermal.cpuTempSource === 'package' || thermal.cpuTempSource === 'ohm') &&
    thermal.cpuTemp != null &&
    thermal.cpuTemp > 80
  ) {
    recommendations.push('System is running hot. Ensure good airflow and consider a cooling pad.')
  } else if (thermal.cpuTempSource === 'zone' && thermal.systemZoneTemp != null && thermal.systemZoneTemp > 90) {
    recommendations.push('System thermal zones are very hot. Ensure good airflow (values may not be CPU package).')
  }

  if (thermal.isThrottling === true) {
    recommendations.push('Thermal throttling detected. Performance may be limited to prevent overheating.')
  }

  disk.drives.forEach((d) => {
    if (d.healthStatus === 'Bad') {
      recommendations.push(`Disk "${d.name}" is failing. Back up your data immediately.`)
    } else if (d.healthStatus === 'Caution') {
      recommendations.push(`Disk "${d.name}" shows caution indicators. Run a full backup.`)
    }
  })

  disk.partitions.forEach((p) => {
    if (p.usedPercent > 90) {
      recommendations.push(`Partition "${p.mount}" is ${p.usedPercent}% full. Free up space.`)
    }
  })

  if (cpuram.usedPercent > 85) {
    recommendations.push('RAM usage is very high. Close unused applications or consider upgrading RAM.')
  }

  if (network.connectionType === 'wifi' && network.wifiSignalPercent != null && network.wifiSignalPercent < 40) {
    recommendations.push('Wi-Fi signal is weak. Move closer to the router or use a 5GHz band.')
  } else if (network.connectionType === 'offline') {
    recommendations.push('No active network connection detected.')
  }

  if (display.monitors.length === 0) {
    recommendations.push('No display detected. Check cable or graphics driver if the screen looks wrong.')
  }

  if (recommendations.length === 0) {
    recommendations.push('Your laptop is in excellent health. Keep it up!')
  }

  return {
    overall,
    grade,
    battery: battery.healthScore,
    thermal: thermal.thermalScore,
    disk: disk.overallDiskScore,
    cpuram: cpuram.overallScore,
    network: network.networkScore,
    audio: audioScore,
    display: displayScore,
    recommendations,
    batteryHealthPercent: battery.healthPercent ?? 0,
    batteryLevel: battery.percent,
    cpuTemp: thermal.cpuTemp ?? thermal.systemZoneTemp ?? thermal.maxTemp ?? 0,
    cpuTempSource: thermal.cpuTempSource,
    diskHealth: disk.drives[0]?.healthStatus || 'Unknown',
    ramUsedPercent: cpuram.usedPercent
  }
}
