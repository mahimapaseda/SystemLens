import { describe, it, expect } from 'vitest'
import {
  isCpuPackageSensorName,
  isCpuCoreSensorName,
  pickFromHardwareMonitorSensors,
  scoreFromTemp
} from './thermal'

describe('thermal sensor helpers', () => {
  it('identifies CPU package sensor names', () => {
    expect(isCpuPackageSensorName('CPU Package')).toBe(true)
    expect(isCpuPackageSensorName('Core (Tctl/Tdie)')).toBe(true)
    expect(isCpuPackageSensorName('Tctl')).toBe(true)
    expect(isCpuPackageSensorName('GPU Hot Spot')).toBe(false)
    expect(isCpuPackageSensorName('Motherboard')).toBe(false)
    expect(isCpuPackageSensorName('NVMe')).toBe(false)
  })

  it('identifies per-core sensor names', () => {
    expect(isCpuCoreSensorName('CPU Core #1')).toBe(true)
    expect(isCpuCoreSensorName('Core #0')).toBe(true)
    expect(isCpuCoreSensorName('CPU Package')).toBe(false)
  })

  it('picks package temp from LHM-style sensors', () => {
    const result = pickFromHardwareMonitorSensors([
      { name: 'CPU Package', type: 'Temperature', value: 72.4 },
      { name: 'CPU Core #0', type: 'Temperature', value: 68 },
      { name: 'CPU Core #1', type: 'Temperature', value: 70 },
      { name: 'GPU Core', type: 'Temperature', value: 55 },
      { name: 'Fan #1', type: 'Fan', value: 2400 }
    ])
    expect(result.found).toBe(true)
    expect(result.cpuTemp).toBe(72.4)
    expect(result.cpuTempPerCore).toEqual([68, 70])
    expect(result.fanSpeeds).toEqual([2400])
  })

  it('falls back to max core when no package sensor', () => {
    const result = pickFromHardwareMonitorSensors([
      { name: 'CPU Core #0', type: 'Temperature', value: 61 },
      { name: 'CPU Core #1', type: 'Temperature', value: 66 }
    ])
    expect(result.found).toBe(true)
    expect(result.cpuTemp).toBe(66)
  })

  it('returns not found when only motherboard/GPU temps', () => {
    const result = pickFromHardwareMonitorSensors([
      { name: 'Motherboard', type: 'Temperature', value: 40 },
      { name: 'GPU Core', type: 'Temperature', value: 50 }
    ])
    expect(result.found).toBe(false)
    expect(result.cpuTemp).toBeNull()
  })

  it('ignores implausible fan DesiredSpeed-like values under 100', () => {
    const result = pickFromHardwareMonitorSensors([
      { name: 'CPU Package', type: 'Temperature', value: 50 },
      { name: 'Fan', type: 'Fan', value: 50 }
    ])
    expect(result.fanSpeeds).toEqual([])
  })

  it('scoreFromTemp penalizes high temperatures', () => {
    expect(scoreFromTemp(55)).toBe(100)
    expect(scoreFromTemp(95)).toBeLessThan(20)
  })
})
