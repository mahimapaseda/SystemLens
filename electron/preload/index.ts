import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('systemlens', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },

  setup: {
    status: () => ipcRenderer.invoke('setup:status'),
    diagnose: () => ipcRenderer.invoke('setup:diagnose'),
    onProgress: (callback: (progress: { step: string; label: string; done: boolean }) => void) => {
      const listener = (_event: unknown, progress: { step: string; label: string; done: boolean }) => {
        callback(progress)
      }
      ipcRenderer.on('setup:progress', listener)
      return () => ipcRenderer.removeListener('setup:progress', listener)
    }
  },

  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },

  battery: {
    get: () => ipcRenderer.invoke('battery:get')
  },
  thermal: {
    get: () => ipcRenderer.invoke('thermal:get')
  },
  disk: {
    get: () => ipcRenderer.invoke('disk:get')
  },
  cpuram: {
    get: () => ipcRenderer.invoke('cpuram:get')
  },
  audio: {
    get: () => ipcRenderer.invoke('audio:get')
  },
  network: {
    get: () => ipcRenderer.invoke('network:get'),
    speedTest: () => ipcRenderer.invoke('network:speedTest')
  },
  display: {
    get: () => ipcRenderer.invoke('display:get')
  },
  health: {
    score: () => ipcRenderer.invoke('health:score')
  },
  history: {
    get: (days?: number) => ipcRenderer.invoke('history:get', days)
  }
})
