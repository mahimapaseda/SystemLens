import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface DiskDriveInfo {
  name: string
  type: string
  size: number
  temperature: number | null
  healthStatus: 'Good' | 'Caution' | 'Bad' | 'Unknown'
  healthPercent: number | null
  smartPassed: boolean | null
  reallocatedSectors: number | null
  pendingSectors: number | null
  uncorrectableErrors: number | null
  wearLevel: number | null
  readSpeed: number | null
  writeSpeed: number | null
  diskScore: number
}

export interface DiskInfo {
  drives: DiskDriveInfo[]
  partitions: {
    fs: string
    mount: string
    size: number
    used: number
    usedPercent: number
  }[]
  totalReadSpeed: number | null
  totalWriteSpeed: number | null
  overallDiskScore: number
}

interface PhysicalDiskRow {
  FriendlyName: string
  MediaType: string
  Size: number
  HealthStatus: string
  Temperature: number | null
  Wear: number | null
  ReadErrorsTotal: number | null
  WriteErrorsTotal: number | null
}

function mapHealthStatus(raw: string): DiskDriveInfo['healthStatus'] {
  const h = (raw || '').toLowerCase()
  if (h === 'healthy' || h === 'ok' || h === 'good') return 'Good'
  if (h === 'warning' || h === 'caution') return 'Caution'
  if (h === 'unhealthy' || h === 'bad' || h === 'failing') return 'Bad'
  return 'Unknown'
}

async function readPhysicalDisks(): Promise<PhysicalDiskRow[]> {
  const ps = await execPowerShell(`
$out = @()
try {
  $disks = Get-PhysicalDisk -EA Stop
  foreach ($d in @($disks)) {
    $temp = $null; $wear = $null; $readErr = $null; $writeErr = $null
    try {
      $rel = $d | Get-StorageReliabilityCounter -EA SilentlyContinue
      if ($rel) {
        if ($null -ne $rel.Temperature) { $temp = [int]$rel.Temperature }
        if ($null -ne $rel.Wear) { $wear = [int]$rel.Wear }
        if ($null -ne $rel.ReadErrorsTotal) { $readErr = [long]$rel.ReadErrorsTotal }
        if ($null -ne $rel.WriteErrorsTotal) { $writeErr = [long]$rel.WriteErrorsTotal }
      }
    } catch {}
    $out += [PSCustomObject]@{
      FriendlyName = [string]$d.FriendlyName
      MediaType = [string]$d.MediaType
      Size = [long]$d.Size
      HealthStatus = [string]$d.HealthStatus
      Temperature = $temp
      Wear = $wear
      ReadErrorsTotal = $readErr
      WriteErrorsTotal = $writeErr
    }
  }
} catch {}
$out | ConvertTo-Json -Compress
`, 20000)

  if (!ps || ps === 'null') return []
  try {
    const parsed = JSON.parse(ps)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list.filter((r: any) => r && r.FriendlyName)
  } catch {
    return []
  }
}

function scoreFromHealth(healthPercent: number | null): number {
  const scoreBase = healthPercent ?? 80
  return scoreBase >= 80
    ? Math.round(75 + (scoreBase - 80) * 1.25)
    : scoreBase >= 60
    ? Math.round(50 + (scoreBase - 60))
    : Math.round(scoreBase * 0.83)
}

export async function getDiskInfo(): Promise<DiskInfo> {
  const [siDisks, siFsSize, siFsStats, physical] = await Promise.all([
    si.diskLayout(),
    si.fsSize(),
    si.fsStats().catch(() => null),
    readPhysicalDisks()
  ])

  const drivesFromSi: DiskDriveInfo[] = siDisks.map((disk) => {
    let healthPercent: number | null = null
    let smartPassed: boolean | null = null
    let healthStatus: DiskDriveInfo['healthStatus'] = 'Unknown'

    if (disk.smartStatus === 'Ok') {
      healthPercent = 95
      smartPassed = true
      healthStatus = 'Good'
    } else if (disk.smartStatus === 'Caution') {
      healthPercent = 60
      smartPassed = false
      healthStatus = 'Caution'
    } else if (disk.smartStatus === 'Bad') {
      healthPercent = 20
      smartPassed = false
      healthStatus = 'Bad'
    }

    return {
      name: disk.name || disk.device || 'Unknown',
      type: disk.type || 'Unknown',
      size: disk.size,
      temperature:
        disk.temperature !== null && disk.temperature !== undefined ? disk.temperature : null,
      healthStatus,
      healthPercent,
      smartPassed,
      reallocatedSectors: null,
      pendingSectors: null,
      uncorrectableErrors: null,
      wearLevel: null,
      readSpeed: null,
      writeSpeed: null,
      diskScore: scoreFromHealth(healthPercent)
    }
  })

  const drivesFromPhysical: DiskDriveInfo[] = physical.map((p) => {
    const healthStatus = mapHealthStatus(p.HealthStatus)
    let healthPercent: number | null = null
    let smartPassed: boolean | null = null
    if (healthStatus === 'Good') {
      healthPercent = 95
      smartPassed = true
    } else if (healthStatus === 'Caution') {
      healthPercent = 60
      smartPassed = false
    } else if (healthStatus === 'Bad') {
      healthPercent = 20
      smartPassed = false
    }

    const wearLevel = typeof p.Wear === 'number' ? p.Wear : null
    if (wearLevel != null && wearLevel > 0) {
      healthPercent = Math.min(healthPercent ?? 100, Math.max(5, 100 - wearLevel))
    }

    return {
      name: p.FriendlyName || 'Unknown',
      type: p.MediaType || 'Unknown',
      size: p.Size || 0,
      temperature: typeof p.Temperature === 'number' ? p.Temperature : null,
      healthStatus,
      healthPercent,
      smartPassed,
      reallocatedSectors: null,
      pendingSectors: null,
      uncorrectableErrors:
        typeof p.ReadErrorsTotal === 'number' || typeof p.WriteErrorsTotal === 'number'
          ? (p.ReadErrorsTotal ?? 0) + (p.WriteErrorsTotal ?? 0)
          : null,
      wearLevel,
      readSpeed: null,
      writeSpeed: null,
      diskScore: scoreFromHealth(healthPercent)
    }
  })

  // Prefer PhysicalDisk rows when present (Windows health + reliability counters)
  const drives = drivesFromPhysical.length > 0 ? drivesFromPhysical : drivesFromSi

  // Merge temperature / SMART from si when physical lacks temp
  if (drivesFromPhysical.length > 0 && drivesFromSi.length > 0) {
    for (const drive of drives) {
      if (drive.temperature == null) {
        const match = drivesFromSi.find(
          (s) =>
            s.name &&
            drive.name &&
            (s.name.toLowerCase().includes(drive.name.toLowerCase().slice(0, 8)) ||
              drive.name.toLowerCase().includes(s.name.toLowerCase().slice(0, 8)))
        )
        if (match?.temperature != null) drive.temperature = match.temperature
        if (drive.smartPassed == null && match?.smartPassed != null) {
          drive.smartPassed = match.smartPassed
        }
      }
    }
  }

  const partitions = siFsSize.map((fs) => ({
    fs: fs.fs,
    mount: fs.mount,
    size: fs.size,
    used: fs.used,
    usedPercent: Math.round(fs.use * 10) / 10
  }))

  const rx = siFsStats?.rx_sec ?? 0
  const wx = siFsStats?.wx_sec ?? 0
  // On Windows these are often 0 — treat as unknown rather than "0 B/s"
  const totalReadSpeed = rx > 0 ? rx : null
  const totalWriteSpeed = wx > 0 ? wx : null

  const overallDiskScore =
    drives.length === 0
      ? 80
      : Math.round(drives.reduce((sum, d) => sum + d.diskScore, 0) / drives.length)

  return {
    drives,
    partitions,
    totalReadSpeed,
    totalWriteSpeed,
    overallDiskScore
  }
}
