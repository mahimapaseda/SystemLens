import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface BatteryInfo {
  hasBattery: boolean
  isCharging: boolean
  acConnected: boolean
  percent: number
  timeRemaining: number | null
  designCapacity: number
  fullChargeCapacity: number
  healthPercent: number | null
  voltage: number
  chargingWatts: number | null
  cycleCount: number
  manufacturer: string
  model: string
  temperature: number | null
  healthScore: number
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  const siBattery = await si.battery()

  const hasBattery = Boolean(siBattery.hasBattery)
  const isCharging = Boolean(siBattery.isCharging)
  const acConnected = Boolean(siBattery.acConnected)

  let designCapacity = siBattery.designedCapacity ?? 0
  let fullChargeCapacity = siBattery.maxCapacity ?? 0
  let cycleCount = siBattery.cycleCount ?? 0
  let voltage = siBattery.voltage ?? 0
  let chargingWatts: number | null = null

  try {
    const psResult = await execPowerShell(`
$s = Get-CimInstance -Namespace root\\WMI -ClassName BatteryStaticData -EA SilentlyContinue | Select-Object -First 1
$f = Get-CimInstance -Namespace root\\WMI -ClassName BatteryFullChargedCapacity -EA SilentlyContinue | Select-Object -First 1
$st = Get-CimInstance -Namespace root\\WMI -ClassName BatteryStatus -EA SilentlyContinue | Select-Object -First 1
$c = Get-CimInstance -Namespace root\\WMI -ClassName BatteryCycleCount -EA SilentlyContinue | Select-Object -First 1
[PSCustomObject]@{
  DesignCapacity     = if($s)  { $s.DesignedCapacity  } else { 0 }
  FullChargeCapacity = if($f)  { $f.FullChargedCapacity } else { 0 }
  CycleCount         = if($c)  { $c.CycleCount          } else { 0 }
  Voltage            = if($st) { $st.Voltage             } else { 0 }
  ChargeRate         = if($st) { $st.ChargeRate          } else { 0 }
  DischargeRate      = if($st) { $st.DischargeRate       } else { 0 }
} | ConvertTo-Json -Compress`, 15000)

    if (psResult) {
      const p = JSON.parse(psResult)
      if (p.DesignCapacity > 0) designCapacity = p.DesignCapacity
      if (p.FullChargeCapacity > 0) fullChargeCapacity = p.FullChargeCapacity
      if (p.CycleCount > 0) cycleCount = p.CycleCount
      if (p.Voltage > 0) voltage = p.Voltage / 1000
      const rate = isCharging ? (p.ChargeRate ?? 0) : (p.DischargeRate ?? 0)
      if (rate > 0) chargingWatts = rate / 1000
    }
  } catch { /* WMI optional */ }

  let healthPercent: number | null = null
  let healthScore = hasBattery ? 70 : 90

  if (designCapacity > 0 && fullChargeCapacity > 0) {
    healthPercent = Math.min(100, (fullChargeCapacity / designCapacity) * 100)
    healthScore =
      healthPercent >= 80 ? Math.round(75 + (healthPercent - 80) * 1.25) :
      healthPercent >= 60 ? Math.round(50 + (healthPercent - 60)) :
      healthPercent >= 40 ? Math.round(25 + (healthPercent - 40) * 1.25) :
      Math.round(healthPercent * 0.625)
  } else if (!hasBattery) {
    healthPercent = null
    healthScore = 100
  }

  return {
    hasBattery,
    isCharging,
    acConnected,
    percent: siBattery.percent ?? 0,
    timeRemaining: siBattery.timeRemaining ?? null,
    designCapacity,
    fullChargeCapacity,
    healthPercent: healthPercent != null ? Math.round(healthPercent * 10) / 10 : null,
    voltage: Math.round(voltage * 100) / 100,
    chargingWatts: chargingWatts != null ? Math.round(chargingWatts * 10) / 10 : null,
    cycleCount,
    manufacturer: siBattery.manufacturer || 'Unknown',
    model: siBattery.model || 'Unknown',
    temperature: null,
    healthScore: Math.max(0, Math.min(100, healthScore))
  }
}
