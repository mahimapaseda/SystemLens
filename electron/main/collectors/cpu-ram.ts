import si from 'systeminformation'

export interface CpuRamInfo {
  // CPU
  cpuBrand: string
  cpuManufacturer: string
  physicalCores: number
  logicalCores: number
  baseSpeed: number  // GHz
  currentSpeed: number  // GHz
  maxSpeed: number   // GHz
  coreUsage: number[]  // per-core %
  totalUsage: number   // overall %
  // RAM
  totalRam: number  // bytes
  usedRam: number
  freeRam: number
  usedPercent: number
  ramSpeed: number  // MHz
  ramType: string
  ramSlots: {
    size: number
    speed: number
    type: string
    manufacturer: string
    bank: string
  }[]
  // Scores
  cpuScore: number
  ramScore: number
  overallScore: number
}

export async function getCpuRamInfo(): Promise<CpuRamInfo> {
  const [siCpu, siLoad, siMem, siMemLayout] = await Promise.all([
    si.cpu(),
    si.currentLoad(),
    si.mem(),
    si.memLayout()
  ])

  const coreUsage = siLoad.cpus.map((c) => Math.round(c.load * 10) / 10)
  const totalUsage = Math.round(siLoad.currentLoad * 10) / 10
  const usedPercent = Math.round((siMem.used / siMem.total) * 1000) / 10

  const ramSlots = siMemLayout.map((slot) => ({
    size: slot.size,
    speed: slot.clockSpeed || 0,
    type: slot.type || 'Unknown',
    manufacturer: slot.manufacturer || 'Unknown',
    bank: slot.bank || 'Unknown'
  }))

  const ramSpeed = siMemLayout[0]?.clockSpeed || 0
  const ramType = siMemLayout[0]?.type || 'Unknown'

  // CPU Score: based on average core usage (lower usage = healthier)
  // High constant load = thermal stress, lower score
  const cpuScore = Math.round(Math.max(0, 100 - totalUsage * 0.5))

  // RAM Score: penalize high usage
  const ramScore =
    usedPercent < 50
      ? 100
      : usedPercent < 70
      ? Math.round(100 - (usedPercent - 50) * 2)
      : usedPercent < 85
      ? Math.round(60 - (usedPercent - 70) * 2.5)
      : Math.round(22 - (usedPercent - 85))

  const overallScore = Math.round((cpuScore * 0.6 + ramScore * 0.4))

  return {
    cpuBrand: siCpu.brand,
    cpuManufacturer: siCpu.manufacturer,
    physicalCores: siCpu.physicalCores,
    logicalCores: siCpu.cores,
    baseSpeed: siCpu.speedMin || 0,
    currentSpeed: siCpu.speed,
    maxSpeed: siCpu.speedMax || 0,
    coreUsage,
    totalUsage,
    totalRam: siMem.total,
    usedRam: siMem.used,
    freeRam: siMem.free,
    usedPercent,
    ramSpeed,
    ramType,
    ramSlots,
    cpuScore,
    ramScore,
    overallScore
  }
}
