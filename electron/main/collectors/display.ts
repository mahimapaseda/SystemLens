import si from 'systeminformation'

export interface DisplayInfo {
  monitors: {
    model: string
    manufacturer: string
    sizeInch: number | null
    resolutionX: number
    resolutionY: number
    refreshRate: number | null
    brightness: number | null
    hdr: boolean
    connection: string
  }[]
  gpus: {
    name: string
    vram: number
    driverVersion: string
  }[]
  displayScore: number
}

export async function getDisplayInfo(): Promise<DisplayInfo> {
  const siGraphics = await si.graphics()

  const monitors = siGraphics.displays.map((d) => ({
    model: d.model || 'Unknown Monitor',
    manufacturer: d.vendor || 'Unknown',
    sizeInch: d.sizex && d.sizey
      ? Math.round(Math.sqrt(d.sizex ** 2 + d.sizey ** 2) / 25.4 * 10) / 10
      : null,
    resolutionX: d.currentResX || d.resolutionx || 0,
    resolutionY: d.currentResY || d.resolutiony || 0,
    refreshRate: d.currentRefreshRate && d.currentRefreshRate > 0 ? d.currentRefreshRate : null,
    brightness: d.currentBrightness || null,
    hdr: false,
    connection: d.connection || 'Unknown'
  }))

  const gpus = siGraphics.controllers.map((c) => ({
    name: c.model || 'Unknown GPU',
    vram: c.vram || 0,
    driverVersion: c.driverVersion || 'Unknown'
  }))

  const displayScore = monitors.length > 0 ? 90 : 70

  return {
    monitors,
    gpus,
    displayScore
  }
}
