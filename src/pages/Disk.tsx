import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { HardDrive, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { formatBytes } from '../utils/formatters'
import './ModulePage.css'

const lc = window.systemlens

export default function Disk() {
  const { disk, setDisk } = useHealthStore()

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.disk?.get()
      if (res?.success) setDisk(res.data)
    }
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [])

  const d = disk

  const statusIcon = (s: string) => {
    if (s === 'Good')    return <CheckCircle size={16} color="var(--color-accent-green)" />
    if (s === 'Caution') return <AlertTriangle size={16} color="var(--color-accent-amber)" />
    if (s === 'Bad')     return <XCircle size={16} color="var(--color-accent-red)" />
    return null
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(79,156,249,0.1)' }}>
          <HardDrive size={24} color="var(--color-accent-blue)" />
        </div>
        <div>
          <h1 className="module-title">Storage Health</h1>
          <p className="module-subtitle">SMART status & disk performance</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={d?.overallDiskScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Drives</span>
              <span className="stat-value">{d?.drives?.length ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Read Speed</span>
              <span className="stat-value text-blue">
                {d?.totalReadSpeed != null && d.totalReadSpeed > 0 ? `${formatBytes(d.totalReadSpeed)}/s` : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Write Speed</span>
              <span className="stat-value text-purple">
                {d?.totalWriteSpeed != null && d.totalWriteSpeed > 0 ? `${formatBytes(d.totalWriteSpeed)}/s` : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Partitions</span>
              <span className="stat-value">{d?.partitions?.length ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drives */}
      {d?.drives && d.drives.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Physical Drives</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Drive</th>
                <th>Type</th>
                <th>Size</th>
                <th>Health</th>
                <th>SMART</th>
                <th>Temp</th>
                <th>Wear</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {d.drives.map((drive, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{drive.name}</td>
                  <td>{drive.type}</td>
                  <td>{formatBytes(drive.size)}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {statusIcon(drive.healthStatus)}
                      {drive.healthStatus}
                    </span>
                  </td>
                  <td>
                    {drive.smartPassed === true
                      ? <span className="badge badge-green">PASSED</span>
                      : drive.smartPassed === false
                      ? <span className="badge badge-red">FAILED</span>
                      : <span className="badge badge-blue">UNKNOWN</span>
                    }
                  </td>
                  <td>{drive.temperature != null ? `${drive.temperature}°C` : 'N/A'}</td>
                  <td>{drive.wearLevel != null ? `${drive.wearLevel}%` : 'N/A'}</td>
                  <td style={{ fontWeight: 700, color: drive.diskScore >= 80 ? 'var(--color-accent-green)' : drive.diskScore >= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }}>
                    {drive.diskScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Partitions */}
      {d?.partitions && d.partitions.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Partitions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {d.partitions.map((p, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.mount}</span>
                  <span className="stat-label">{formatBytes(p.used)} / {formatBytes(p.size)} ({p.usedPercent}%)</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${p.usedPercent}%`,
                      background: p.usedPercent > 90
                        ? 'var(--color-accent-red)'
                        : p.usedPercent > 75
                        ? 'var(--color-accent-amber)'
                        : 'var(--color-accent-blue)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
