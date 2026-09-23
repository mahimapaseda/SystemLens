import type { Tray } from 'electron'

let trayRef: Tray | null = null

export function setTray(tray: Tray | null): void {
  trayRef = tray
}

export function updateTrayHealthTooltip(overall: number, grade: string): void {
  if (!trayRef) return
  trayRef.setToolTip(`SystemLens — Health: ${overall} (Grade ${grade})`)
}
