import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import { generateItDiagnosticPdf, type DiagnosticHistoryRow } from '../utils/it-diagnostic-report'
import './ModulePage.css'
import './Reports.css'

const lc = window.systemlens

export default function Reports() {
  const [history, setHistory] = useState<DiagnosticHistoryRow[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.history?.get(days)
      if (res?.success) setHistory(res.data as DiagnosticHistoryRow[])
    }
    fetch()
  }, [days])

  const exportPdf = () => {
    try {
      generateItDiagnosticPdf(history, days)
    } catch (err) {
      console.error('PDF export failed:', err)
      const message = err instanceof Error ? err.message : String(err)
      window.alert(`Could not create PDF report.\n\n${message}`)
    }
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(79,156,249,0.1)' }}>
          <FileText size={24} color="var(--color-accent-blue)" />
        </div>
        <div>
          <h1 className="module-title">Reports & History</h1>
          <p className="module-subtitle">Health history and IT diagnostic export</p>
        </div>
      </div>

      <div className="card reports-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <span className="stat-label">Show last</span>
          {[1, 7, 14, 30].map((d) => (
            <button
              key={d}
              className={`period-btn ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d === 1 ? '24h' : `${d}d`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <button
            className="export-btn export-btn-primary"
            onClick={exportPdf}
            disabled={history.length === 0}
            title={history.length === 0 ? 'No snapshots to export' : 'Export IT technical diagnostic PDF'}
          >
            <Download size={16} /> IT Diagnostic PDF
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="card-section-title">Health History ({history.length} snapshots)</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No history yet. Data is collected automatically in the background and when you open the dashboard.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Overall</th>
                <th>Battery</th>
                <th>Thermal</th>
                <th>Disk</th>
                <th>CPU/RAM</th>
                <th>Batt Health</th>
                <th>CPU Temp</th>
                <th>RAM Used</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 50).map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: row.overall_score >= 70 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)' }}>
                    {row.overall_score}
                  </td>
                  <td>{row.battery_score}</td>
                  <td>{row.thermal_score}</td>
                  <td>{row.disk_score}</td>
                  <td>{row.cpuram_score}</td>
                  <td>{row.battery_health_percent?.toFixed(1)}%</td>
                  <td>{row.cpu_temp?.toFixed(1)}°C</td>
                  <td>{row.ram_used_percent?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
