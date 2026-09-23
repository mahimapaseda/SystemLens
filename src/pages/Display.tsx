import { useState, useEffect } from 'react'
import { Monitor } from 'lucide-react'
import ScoreRing from '../components/shared/ScoreRing'
import './ModulePage.css'

const lc = window.systemlens

interface DisplayData {
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

export default function Display() {
  const [data, setData] = useState<DisplayData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const res = await lc?.display?.get()
      if (res?.success) setData(res.data)
    }
    fetchData()
    const id = setInterval(fetchData, 10000)
    return () => clearInterval(id)
  }, [])

  const d = data
  const totalVram = d?.gpus?.reduce((sum, g) => sum + g.vram, 0) ?? 0

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(34,211,165,0.1)' }}>
          <Monitor size={24} color="var(--color-accent-green)" />
        </div>
        <div>
          <h1 className="module-title">Display</h1>
          <p className="module-subtitle">{d?.gpus ? d.gpus.map(g => g.name).join(' + ') : 'Detecting GPU...'}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={d?.displayScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Monitors</span>
              <span className="stat-value">{d?.monitors?.length ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Graphics Cards</span>
              <span className="stat-value">{d?.gpus?.length ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total VRAM</span>
              <span className="stat-value">{totalVram ? `${totalVram} MB` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {d?.gpus && d.gpus.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Graphics Cards</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>GPU Model</th>
                <th>VRAM</th>
                <th>Driver Version</th>
              </tr>
            </thead>
            <tbody>
              {d.gpus.map((g, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{g.name}</td>
                  <td>{g.vram ? `${g.vram} MB` : 'N/A'}</td>
                  <td>{g.driverVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d?.monitors && d.monitors.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Connected Monitors</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Monitor</th>
                <th>Size</th>
                <th>Resolution</th>
                <th>Refresh Rate</th>
                <th>Connection</th>
                <th>Brightness</th>
              </tr>
            </thead>
            <tbody>
              {d.monitors.map((m, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                    {m.manufacturer} {m.model}
                  </td>
                  <td>{m.sizeInch ? `${m.sizeInch}"` : 'N/A'}</td>
                  <td>{m.resolutionX && m.resolutionY ? `${m.resolutionX}×${m.resolutionY}` : 'N/A'}</td>
                  <td style={{
                    color: (m.refreshRate ?? 0) >= 120
                      ? 'var(--color-accent-green)'
                      : 'var(--color-text-primary)'
                  }}>
                    {m.refreshRate != null && m.refreshRate > 0 ? `${m.refreshRate} Hz` : 'N/A'}
                  </td>
                  <td>{m.connection}</td>
                  <td>{m.brightness != null ? `${m.brightness}%` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

