import { create } from 'zustand'

// Type stubs that mirror backend types (simplified for renderer)
export interface BatteryState {
  hasBattery: boolean
  isCharging: boolean
  acConnected: boolean
  percent: number
  healthPercent: number | null
  chargingWatts: number | null
  cycleCount: number
  voltage: number
  manufacturer: string
  model: string
  healthScore: number
  designCapacity: number
  fullChargeCapacity: number
  timeRemaining: number | null
}

export interface ThermalState {
  cpuTemp: number | null
  cpuTempPerCore: number[]
  gpuTemp: number | null
  maxTemp: number | null
  fanSpeeds: number[]
  isThrottling: boolean | null
  thermalScore: number
  sensorAvailable?: boolean
  zones?: { name: string; temp: number }[]
  cpuTempSource?: 'package' | 'ohm' | 'zone' | 'none'
  gpuTempSource?: 'nvidia' | 'si' | 'none'
  systemZoneTemp?: number | null
}

export interface DiskState {
  drives: {
    name: string
    type: string
    size: number
    healthStatus: string
    healthPercent: number | null
    smartPassed: boolean | null
    temperature: number | null
    diskScore: number
    wearLevel?: number | null
    reallocatedSectors?: number | null
    pendingSectors?: number | null
    uncorrectableErrors?: number | null
  }[]
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

export interface CpuRamState {
  cpuBrand: string
  physicalCores: number
  logicalCores: number
  currentSpeed: number
  maxSpeed: number
  coreUsage: number[]
  totalUsage: number
  totalRam: number
  usedRam: number
  usedPercent: number
  ramSpeed: number
  ramType: string
  overallScore: number
}

export interface AudioState {
  devices: {
    name: string
    type: string
    status: string
    isDefault: boolean
    manufacturer: string
  }[]
  audioScore: number
}

export interface NetworkState {
  wifiConnected: boolean
  wifiSsid: string
  wifiSignalPercent: number | null
  wifiBand: string
  connectionType?: 'wifi' | 'ethernet' | 'offline'
  downloadSpeed: number
  uploadSpeed: number
  pingMs: number | null
  networkScore: number
}

export interface HealthScoreState {
  overall: number
  grade: string
  battery: number
  thermal: number
  disk: number
  cpuram: number
  network: number
  audio: number
  display: number
  recommendations: string[]
}

interface HealthStore {
  battery: BatteryState | null
  thermal: ThermalState | null
  disk: DiskState | null
  cpuram: CpuRamState | null
  audio: AudioState | null
  network: NetworkState | null
  healthScore: HealthScoreState | null
  loading: Record<string, boolean>
  errors: Record<string, string | null>

  // Setters
  setBattery: (data: BatteryState) => void
  setThermal: (data: ThermalState) => void
  setDisk: (data: DiskState) => void
  setCpuRam: (data: CpuRamState) => void
  setAudio: (data: AudioState) => void
  setNetwork: (data: NetworkState) => void
  setHealthScore: (data: HealthScoreState) => void
  setLoading: (key: string, value: boolean) => void
  setError: (key: string, error: string | null) => void
}

export const useHealthStore = create<HealthStore>((set) => ({
  battery:     null,
  thermal:     null,
  disk:        null,
  cpuram:      null,
  audio:       null,
  network:     null,
  healthScore: null,
  loading:     {},
  errors:      {},

  setBattery:     (data) => set({ battery: data }),
  setThermal:     (data) => set({ thermal: data }),
  setDisk:        (data) => set({ disk: data }),
  setCpuRam:      (data) => set({ cpuram: data }),
  setAudio:       (data) => set({ audio: data }),
  setNetwork:     (data) => set({ network: data }),
  setHealthScore: (data) => set({ healthScore: data }),
  setLoading: (key, value) =>
    set((state) => ({ loading: { ...state.loading, [key]: value } })),
  setError: (key, error) =>
    set((state) => ({ errors: { ...state.errors, [key]: error } }))
}))
