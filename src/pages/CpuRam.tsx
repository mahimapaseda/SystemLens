import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Cpu } from 'lucide-react'
import { formatBytes } from '../utils/formatters'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './ModulePage.css'

const lc = window.systemlens

export default function CpuRam() {
  const { cpuram, setCpuRam } = useHealthStore()

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.cpuram?.get()
      if (res?.success) setCpuRam(res.data)
    }
    fetch()
    const id = setInterval(fetch, 8000)
    return () => clearInterval(id)
  }, [])

  const c = cpuram

  const coreChartData = c?.coreUsage?.map((usage, i) => ({
    name: `C${i}`,
    usage: Math.round(usage)
  })) ?? []

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
          <Cpu size={24} color="var(--color-accent-purple)" />
        </div>
        <div>
          <h1 className="module-title">CPU & RAM</h1>
          <p className="module-subtitle">{c?.cpuBrand ?? 'Detecting...'}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={c?.overallScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">CPU Usage</span>
              <span className="stat-value text-purple">{c?.totalUsage?.toFixed(1) ?? 'N/A'}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">CPU Speed</span>
              <span className="stat-value">{c?.currentSpeed?.toFixed(2) ?? 'N/A'} GHz</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cores</span>
              <span className="stat-value">{c?.physicalCores ?? 'N/A'}P / {c?.logicalCores ?? 'N/A'}L</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Speed</span>
              <span className="stat-value">{c?.maxSpeed?.toFixed(2) ?? 'N/A'} GHz</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">RAM Used</span>
              <span className={`stat-value ${c && c.usedPercent > 80 ? 'text-red' : c && c.usedPercent > 60 ? 'text-amber' : 'text-green'}`}>
                {c?.usedPercent?.toFixed(1) ?? 'N/A'}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">RAM Total</span>
              <span className="stat-value">{c?.totalRam ? formatBytes(c.totalRam) : 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">RAM Used</span>
              <span className="stat-value">{c?.usedRam ? formatBytes(c.usedRam) : 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">RAM Type</span>
              <span className="stat-value">{c?.ramType ?? 'N/A'} @ {c?.ramSpeed ?? 'N/A'} MHz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-core usage bar chart */}
      {coreChartData.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Per-Core CPU Usage</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={coreChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                formatter={(v: number) => [`${v}%`, 'Usage']}
              />
              <Bar dataKey="usage" fill="var(--color-accent-green)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RAM usage bar */}
      {c && (
        <div className="card">
          <h2 className="card-section-title">Memory Usage</h2>
          <div className="big-charge-bar-track" style={{ height: 20 }}>
            <div
              className="big-charge-bar-fill"
              style={{
                width: `${c.usedPercent}%`,
                background: c.usedPercent > 80 ? 'var(--gradient-amber)' : 'var(--gradient-purple)'
              }}
            />
          </div>
          <div className="charge-labels" style={{ marginTop: 8 }}>
            <span className="stat-label">{formatBytes(c.usedRam)} used</span>
            <span className="stat-value" style={{ fontSize: 14 }}>{c.usedPercent.toFixed(1)}%</span>
            <span className="stat-label">{formatBytes(c.totalRam)} total</span>
          </div>
        </div>
      )}
    </div>
  )
}
