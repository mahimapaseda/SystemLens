import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface NetworkInfo {
  wifiConnected: boolean
  wifiSsid: string
  wifiSignalDb: number | null
  wifiSignalPercent: number | null
  wifiBand: '2.4GHz' | '5GHz' | '6GHz' | 'Unknown'
  wifiChannel: number
  wifiSecurity: string
  connectionType: 'wifi' | 'ethernet' | 'offline'
  downloadSpeed: number
  uploadSpeed: number
  pingMs: number | null
  adapters: { name: string; type: string; speed: number; isConnected: boolean; ipv4: string; mac: string }[]
  networkScore: number
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  const [siNet, siNetStats, siWifiConn] = await Promise.all([
    si.networkInterfaces(),
    si.networkStats(),
    si.wifiConnections().catch(() => [])
  ])

  const adapters = (Array.isArray(siNet) ? siNet : [siNet]).map((a: any) => ({
    name: a.iface ?? 'Unknown',
    type: a.type ?? 'Unknown',
    speed: a.speed ?? 0,
    isConnected: a.operstate === 'up',
    ipv4: a.ip4 ?? '',
    mac: a.mac ?? ''
  }))

  const wiredUp = adapters.find(
    (a) => a.isConnected && /ethernet|wired/i.test(a.type) && !/virtual|loopback|bluetooth/i.test(a.name)
  )
  const wifiUp = adapters.find(
    (a) => a.isConnected && /wireless|wifi/i.test(a.type)
  )

  const activeWifi = Array.isArray(siWifiConn) ? siWifiConn.find((w) => w.ssid) ?? siWifiConn[0] : null

  let connectionType: NetworkInfo['connectionType'] = 'offline'
  if (wifiUp || activeWifi?.ssid) connectionType = 'wifi'
  else if (wiredUp) connectionType = 'ethernet'

  let pingMs: number | null = null
  try {
    const pingResult = await execPowerShell(
      `(Test-Connection -ComputerName 8.8.8.8 -Count 1 -EA SilentlyContinue).ResponseTime`,
      12000
    )
    const val = parseInt(pingResult.trim(), 10)
    if (!isNaN(val) && val >= 0) pingMs = val
  } catch { /* optional */ }

  const activeStats =
    siNetStats.find((s) => (s.rx_sec ?? 0) + (s.tx_sec ?? 0) > 0) ?? siNetStats[0]

  let wifiSignalDb: number | null = null
  let wifiSignalPercent: number | null = null
  let wifiBand: NetworkInfo['wifiBand'] = 'Unknown'

  if (connectionType === 'wifi' && activeWifi) {
    if (typeof activeWifi.signalLevel === 'number') {
      wifiSignalDb = activeWifi.signalLevel
      wifiSignalPercent =
        typeof activeWifi.quality === 'number' && activeWifi.quality > 0
          ? Math.max(0, Math.min(100, activeWifi.quality))
          : Math.max(0, Math.min(100, 2 * (wifiSignalDb + 100)))
    }
    if (activeWifi.frequency) {
      if (activeWifi.frequency >= 6000) wifiBand = '6GHz'
      else if (activeWifi.frequency >= 5000) wifiBand = '5GHz'
      else if (activeWifi.frequency >= 2400) wifiBand = '2.4GHz'
    }
  }

  let networkScore = 100
  if (connectionType === 'offline') {
    networkScore = 30
  } else if (connectionType === 'ethernet') {
    networkScore = 95
    if (pingMs !== null && pingMs > 100) networkScore -= 15
    else if (pingMs !== null && pingMs > 50) networkScore -= 5
  } else {
    if (wifiSignalPercent != null) {
      if (wifiSignalPercent < 40) networkScore -= 30
      else if (wifiSignalPercent < 60) networkScore -= 15
    }
    if (pingMs !== null && pingMs > 100) networkScore -= 20
    else if (pingMs !== null && pingMs > 50) networkScore -= 10
  }

  return {
    wifiConnected: connectionType === 'wifi',
    wifiSsid: activeWifi?.ssid ?? '',
    wifiSignalDb,
    wifiSignalPercent,
    wifiBand,
    wifiChannel: activeWifi?.channel ?? 0,
    wifiSecurity: Array.isArray(activeWifi?.security)
      ? activeWifi!.security.join(', ')
      : (activeWifi?.security as string) ?? 'Unknown',
    connectionType,
    downloadSpeed: activeStats?.rx_sec ?? 0,
    uploadSpeed: activeStats?.tx_sec ?? 0,
    pingMs,
    adapters,
    networkScore: Math.max(0, networkScore)
  }
}
