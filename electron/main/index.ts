import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { initDatabase } from './database'
import { setTray } from './tray-state'
import { startHealthScheduler } from './scheduler'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function showMainWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    show: false,
    frame: false,
    backgroundColor: '#0a1210',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    },
    icon: join(__dirname, '../../assets/icons/icon.png')
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Close = quit fully (do not leave a background tray process)
  mainWindow.on('close', () => {
    isQuitting = true
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, '../../assets/icons/tray.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open SystemLens', click: () => showMainWindow() },
    {
      label: 'Check for updates…',
      click: () => shell.openExternal('https://github.com/mahimapaseda/LapCharm/releases')
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('SystemLens — Laptop Health Monitor')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => showMainWindow())
  tray.on('click', () => showMainWindow())
  setTray(tray)
}

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256')
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('enable-low-end-device-mode')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.systemlens.app')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    initDatabase()
    registerIpcHandlers(ipcMain)

    createWindow()
    createTray()
    startHealthScheduler()

    app.on('activate', () => {
      showMainWindow()
    })
  })
}

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  isQuitting = true
  if (tray) {
    tray.destroy()
    tray = null
    setTray(null)
  }
  app.quit()
})

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => {
  isQuitting = true
  mainWindow?.close()
})

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('shell:openExternal', (_event, url: string) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return shell.openExternal(url)
  }
  return Promise.reject(new Error('Invalid URL'))
})
