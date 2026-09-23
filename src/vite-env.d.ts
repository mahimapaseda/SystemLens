/// <reference types="vite/client" />

declare module '*.png' {
  const src: string
  export default src
}

type SystemLensResult<T> = { success: true; data: T } | { success: false; error: string }

interface SystemLensAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  app: {
    getVersion: () => Promise<string>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  battery: {
    get: () => Promise<SystemLensResult<import('./store/health.store').BatteryState>>
  }
  thermal: {
    get: () => Promise<SystemLensResult<import('./store/health.store').ThermalState>>
  }
  disk: {
    get: () => Promise<SystemLensResult<import('./store/health.store').DiskState>>
  }
  cpuram: {
    get: () => Promise<SystemLensResult<import('./store/health.store').CpuRamState>>
  }
  audio: {
    get: () => Promise<SystemLensResult<import('./store/health.store').AudioState>>
  }
  network: {
    get: () => Promise<SystemLensResult<import('./store/health.store').NetworkState>>
    speedTest: () => Promise<SystemLensResult<{
      downloadMbps: number
      uploadMbps: number
      latencyMs: number
      server: string
    }>>
  }
  display: {
    get: () => Promise<SystemLensResult<unknown>>
  }
  health: {
    score: () => Promise<SystemLensResult<import('./store/health.store').HealthScoreState>>
  }
  history: {
    get: (days?: number) => Promise<SystemLensResult<unknown[]>>
  }
}

interface Window {
  systemlens: SystemLensAPI
}
