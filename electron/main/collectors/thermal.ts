import si from 'systeminformation'
import { execPowerShell } from './powershell'

export type CpuTempSource = 'package' | 'ohm' | 'zone' | 'none'
export type GpuTempSource = 'nvidia' | 'si' | 'none'

export interface HardwareMonitorSensor {
  name: string
  type: string
  value: number
}

export interface ThermalInfo {
  cpuTemp: number | null
  cpuTempPerCore: number[]
  gpuTemp: number | null
  maxTemp: number | null
  fanSpeeds: number[]
  /** null = unknown (no reliable package/ohm CPU reading) */
  isThrottling: boolean | null
  thermalScore: number
  sensorAvailable: boolean
  zones: { name: string; temp: number }[]
  cpuTempSource: CpuTempSource
  gpuTempSource: GpuTempSource
  /** Hottest ACPI zone when present — not CPU package */
  systemZoneTemp: number | null
}

export function scoreFromTemp(maxTemp: number): number {
  if (maxTemp <= 60) return 100
  if (maxTemp <= 70) return Math.round(100 - (maxTemp - 60) * 3)
  if (maxTemp <= 80) return Math.round(70 - (maxTemp - 70) * 4)
  if (maxTemp <= 90) return Math.round(30 - (maxTemp - 80) * 2)
  return Math.max(0, Math.round(10 - (maxTemp - 90) * 2))
}

/** True when sensor name looks like CPU package / die (not motherboard/zone). */
export function isCpuPackageSensorName(name: string): boolean {
  const n = name.toLowerCase()
  if (/motherboard|pch|soc|ambient|hdd|ssd|gpu|nvme|dimm|memory|vr/.test(n)) return false
  return (
    /cpu package|package|tctl|tdie|cpu \(tctl|cpu die|cpu temperature|core \(tctl/.test(n) ||
    /^cpu$/.test(n.trim()) ||
    /cpu core #?\d+|core #\d+|core temperature/.test(n)
  )
}

export function isCpuCoreSensorName(name: string): boolean {
  const n = name.toLowerCase()
  return /core #\d+|core \d+|cpu core #?\d+/.test(n) && !/package|tctl|tdie/.test(n)
}

export function isFanSensorName(name: string, type: string): boolean {
  return type.toLowerCase() === 'fan' || /fan/i.test(name)
}

/**
 * Pick CPU package temp, per-core temps, and fan RPMs from LHM/OHM-style sensors.
 */
export function pickFromHardwareMonitorSensors(sensors: HardwareMonitorSensor[]): {
  cpuTemp: number | null
  cpuTempPerCore: number[]
  fanSpeeds: number[]
  found: boolean
} {
  const temps = sensors.filter(
    (s) => s.type.toLowerCase() === 'temperature' && typeof s.value === 'number' && s.value > 0 && s.value < 125
  )
  const packageHits = temps.filter((s) => isCpuPackageSensorName(s.name) && !isCpuCoreSensorName(s.name))
  const coreHits = temps.filter((s) => isCpuCoreSensorName(s.name))

  let cpuTemp: number | null = null
  if (packageHits.length > 0) {
    cpuTemp = Math.max(...packageHits.map((s) => s.value))
  } else if (coreHits.length > 0) {
    cpuTemp = Math.max(...coreHits.map((s) => s.value))
  }

  const cpuTempPerCore = coreHits
    .map((s) => Math.round(s.value * 10) / 10)
    .filter((t) => t > 0)

  const fanSpeeds = sensors
    .filter((s) => isFanSensorName(s.name, s.type) && typeof s.value === 'number' && s.value > 100 && s.value < 20000)
    .map((s) => Math.round(s.value))

  return {
    cpuTemp,
    cpuTempPerCore,
    fanSpeeds,
    found: cpuTemp != null
  }
}

async function readHardwareMonitorSensors(): Promise<HardwareMonitorSensor[]> {
  const ps = await execPowerShell(`
$nsList = @('root\\LibreHardwareMonitor','root\\OpenHardwareMonitor')
$out = @()
foreach ($ns in $nsList) {
  try {
    $sensors = Get-CimInstance -Namespace $ns -ClassName Sensor -EA Stop
    foreach ($s in @($sensors)) {
      $val = [double]$s.Value
      if ($val -gt 0) {
        $out += [PSCustomObject]@{ name = [string]$s.Name; type = [string]$s.SensorType; value = $val }
      }
    }
    if ($out.Count -gt 0) { break }
  } catch {}
}
$out | ConvertTo-Json -Compress
`, 20000)

  if (!ps || ps === 'null') return []
  try {
    const parsed = JSON.parse(ps)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list
      .filter((s: any) => s && typeof s.value === 'number')
      .map((s: any) => ({
        name: String(s.name || ''),
        type: String(s.type || ''),
        value: s.value
      }))
  } catch {
    return []
  }
}

async function readWindowsThermalZones(): Promise<{ name: string; temp: number }[]> {
  const ps = await execPowerShell(`
$out = @()
try {
  $samples = (Get-Counter '\\Thermal Zone Information(*)\\Temperature' -EA Stop).CounterSamples
  foreach ($s in $samples) {
    $c = [math]::Round($s.CookedValue - 273.15, 1)
    if ($c -gt 0 -and $c -lt 125) {
      $out += [PSCustomObject]@{ name = $s.InstanceName; temp = $c }
    }
  }
} catch {}
$out | ConvertTo-Json -Compress
`, 20000)

  if (!ps || ps === 'null') return []
  try {
    const parsed = JSON.parse(ps)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list
      .filter((z: any) => typeof z?.temp === 'number' && z.temp > 0)
      .map((z: any) => ({ name: String(z.name || 'Zone'), temp: z.temp }))
  } catch {
    return []
  }
}

async function readGpuTempWithSource(): Promise<{ temp: number | null; source: GpuTempSource }> {
  try {
    const nvsmi = await execPowerShell(
      `(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader 2>$null | Select-Object -First 1).Trim()`,
      15000
    )
    const val = parseFloat(nvsmi)
    if (!isNaN(val) && val > 0 && val < 125) {
      return { temp: val, source: 'nvidia' }
    }
  } catch { /* optional */ }

  try {
    const gfx = await si.graphics()
    const fromSi = gfx.controllers
      .map((c) => c.temperatureGpu)
      .filter((t): t is number => typeof t === 'number' && t > 0 && t < 125)
    if (fromSi.length > 0) {
      return { temp: Math.max(...fromSi), source: 'si' }
    }
  } catch { /* optional */ }

  return { temp: null, source: 'none' }
}

async function readWin32FanSpeeds(): Promise<number[]> {
  try {
    const ps = await execPowerShell(`
$fanList = @()
$fans = Get-CimInstance Win32_Fan -EA SilentlyContinue
if ($fans) {
  foreach ($f in @($fans)) {
    if ($f.DesiredSpeed -and $f.DesiredSpeed -gt 100 -and $f.DesiredSpeed -lt 20000) {
      $fanList += [int]$f.DesiredSpeed
    }
  }
}
$fanList | ConvertTo-Json -Compress
`, 15000)
    if (!ps || ps === 'null') return []
    const parsed = JSON.parse(ps)
    return (Array.isArray(parsed) ? parsed : [parsed]).filter(
      (n) => typeof n === 'number' && n > 100 && n < 20000
    )
  } catch {
    return []
  }
}

export async function getThermalInfo(): Promise<ThermalInfo> {
  const [siTemp, hwSensors, gpuResult, zones, winFans] = await Promise.all([
    si.cpuTemperature(),
    readHardwareMonitorSensors(),
    readGpuTempWithSource(),
    readWindowsThermalZones(),
    readWin32FanSpeeds()
  ])

  const fromOhm = pickFromHardwareMonitorSensors(hwSensors)

  let cpuTemp: number | null = null
  let cpuTempPerCore: number[] = []
  let cpuTempSource: CpuTempSource = 'none'
  let fanSpeeds: number[] = []

  // 1) LibreHardwareMonitor / OpenHardwareMonitor
  if (fromOhm.found) {
    cpuTemp = fromOhm.cpuTemp
    cpuTempPerCore = fromOhm.cpuTempPerCore
    cpuTempSource = 'ohm'
    fanSpeeds = fromOhm.fanSpeeds
  }

  // 2) systeminformation package/core temps
  if (cpuTemp == null) {
    const siMain =
      typeof siTemp.main === 'number' && siTemp.main > 0 && siTemp.main < 125 ? siTemp.main : null
    const siCores =
      siTemp.cores && siTemp.cores.length > 0
        ? siTemp.cores.filter((t) => typeof t === 'number' && t > 0 && t < 125).map((t) => Math.round(t * 10) / 10)
        : []
    if (siMain != null || siCores.length > 0) {
      cpuTemp = siMain ?? Math.max(...siCores)
      cpuTempPerCore = siCores
      cpuTempSource = 'package'
    }
  }

  // 3) ACPI zones — never assign as cpuTemp
  const systemZoneTemp =
    zones.length > 0 ? Math.max(...zones.map((z) => z.temp)) : null

  if (cpuTemp == null && systemZoneTemp != null) {
    cpuTempSource = 'zone'
  }

  if (fanSpeeds.length === 0) {
    fanSpeeds = winFans
  }

  const { temp: gpuTemp, source: gpuTempSource } = gpuResult

  const scoreCandidates = [
    cpuTempSource === 'package' || cpuTempSource === 'ohm' ? cpuTemp : null,
    cpuTempSource === 'zone' ? systemZoneTemp : null,
    gpuTemp,
    ...cpuTempPerCore
  ].filter((t): t is number => typeof t === 'number' && t > 0)

  const maxTemp = scoreCandidates.length > 0 ? Math.max(...scoreCandidates) : null
  const sensorAvailable = maxTemp != null || zones.length > 0 || gpuTemp != null

  const reliableCpu = cpuTempSource === 'package' || cpuTempSource === 'ohm'
  const isThrottling: boolean | null =
    reliableCpu && cpuTemp != null ? cpuTemp > 90 : null

  let thermalScore = 70
  if (maxTemp != null) {
    thermalScore = scoreFromTemp(maxTemp)
  } else if (!sensorAvailable) {
    thermalScore = 70
  }

  return {
    cpuTemp: cpuTemp != null ? Math.round(cpuTemp * 10) / 10 : null,
    cpuTempPerCore,
    gpuTemp: gpuTemp != null ? Math.round(gpuTemp * 10) / 10 : null,
    maxTemp: maxTemp != null ? Math.round(maxTemp * 10) / 10 : null,
    fanSpeeds,
    isThrottling,
    thermalScore: Math.max(0, Math.min(100, thermalScore)),
    sensorAvailable,
    zones,
    cpuTempSource,
    gpuTempSource,
    systemZoneTemp: systemZoneTemp != null ? Math.round(systemZoneTemp * 10) / 10 : null
  }
}
