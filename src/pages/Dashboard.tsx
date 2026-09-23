import { useEffect, useCallback, useState } from 'react'
import {
  Battery, Thermometer, HardDrive, Cpu, Volume2, Wifi,
  AlertTriangle, CheckCircle, RefreshCw, Wrench, Wind, FileText
} from 'lucide-react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'
import './Dashboard.css'

const lc = window.systemlens
const POLL_MS = 15_000

function statusLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Very Good'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  if (score > 0) return 'Needs Attention'
  return '—'
}

function statusClass(score: number): string {
  if (score >= 85) return 'ok-excellent'
  if (score >= 70) return 'ok-good'
  if (score >= 55) return 'ok-fair'
  if (score > 0) return 'ok-poor'
  return 'ok-muted'
}

function overallMessage(score: number, grade: string): string {
  if (score >= 85) return 'Your laptop is in great condition. Keep up the good work!'
  if (score >= 70) return `Overall grade ${grade} — solid health with a few areas to watch.`
  if (score >= 55) return 'Some components need attention. Review the recommendations below.'
  if (score > 0) return 'Health score is low. Follow the recommendations to improve stability.'
  return 'Collecting sensor data…'
}

function formatBytes(bytes: number | undefined): string {
  if (bytes == null || bytes <= 0) return 'N/A'
  const gb = bytes / 1e9
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
  return `${gb.toFixed(0)} GB`
}

function formatTimeRemaining(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return 'N/A'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

function recIcon(text: string) {
  const t = text.toLowerCase()
  if (t.includes('airflow') || t.includes('thermal') || t.includes('vent') || t.includes('cool')) return Wind
  if (t.includes('battery')) return Battery
  if (t.includes('driver') || t.includes('update')) return Wrench
  if (t.includes('report') || t.includes('export')) return FileText
  if (t.includes('disk') || t.includes('storage') || t.includes('backup')) return HardDrive
  return CheckCircle
}

interface DetailRow {
  label: string
  value: string
}

function ModuleDetailCard({
  icon: Icon,
  label,
  score,
  color,
  rows,
  onClick
}: {
  icon: React.ElementType
  label: string
  score: number
  color: string
  rows: DetailRow[]
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`detail-card ${onClick ? 'detail-card-clickable' : ''}`}
      onClick={onClick}
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div className="detail-card-top">
        <div className="detail-card-identity">
          <div className="detail-icon" style={{ background: `${color}22`, color }}>
            <Icon size={16} />
          </div>
          <div>
            <div className="detail-title">{label}</div>
            <div className={`detail-status ${statusClass(score)}`}>{statusLabel(score)}</div>
          </div>
        </div>
        <ScoreRing score={score} size={56} strokeWidth={5} />
      </div>
      <div className="detail-rows">
        {rows.map((r) => (
          <div className="detail-row" key={r.label}>
            <span>{r.label}</span>
            <strong>{r.value}</strong>
          </div>
        ))}
      </div>
    </button>
  )
}

export default function Dashboard() {
  const {
    battery, thermal, disk, cpuram, network, audio, healthScore,
    setBattery, setThermal, setDisk, setCpuRam, setNetwork, setAudio,
    setHealthScore, setLoading
  } = useHealthStore()

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [sysInfo, setSysInfo] = useState<{ os?: string; model?: string }>({})

  const fetchAll = useCallback(async () => {
    setLoading('dashboard', true)
    try {
      const [bat, therm, dsk, cpu, net, aud, score] = await Promise.all([
        lc?.battery?.get(),
        lc?.thermal?.get(),
        lc?.disk?.get(),
        lc?.cpuram?.get(),
        lc?.network?.get(),
        lc?.audio?.get(),
        lc?.health?.score()
      ])
      if (bat?.success) setBattery(bat.data)
      if (therm?.success) setThermal(therm.data)
      if (dsk?.success) setDisk(dsk.data)
      if (cpu?.success) setCpuRam(cpu.data)
      if (net?.success) setNetwork(net.data)
      if (aud?.success) setAudio(aud.data)
      if (score?.success) setHealthScore(score.data)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading('dashboard', false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, POLL_MS)
    return () => clearInterval(id)
  }, [fetchAll])

  useEffect(() => {
    // Best-effort device/OS labels from available module data
    const model = cpuram?.cpuBrand?.split('@')[0]?.trim()
    if (model) setSysInfo((s) => ({ ...s, model }))
    lc?.app?.getVersion?.().catch(() => {})
    // OS string via PowerShell-backed path isn't exposed; keep a friendly default
    setSysInfo((s) => ({ ...s, os: s.os || 'Windows' }))
  }, [cpuram?.cpuBrand])

  const overall = healthScore?.overall ?? 0
  const grade = healthScore?.grade ?? '—'

  const radarData = healthScore
    ? [
        { subject: 'Battery', score: healthScore.battery },
        { subject: 'Thermal', score: healthScore.thermal },
        { subject: 'Disk', score: healthScore.disk },
        { subject: 'CPU', score: healthScore.cpuram },
        { subject: 'Network', score: healthScore.network },
        { subject: 'Audio', score: healthScore.audio }
      ]
    : []

  const recommendations = healthScore?.recommendations?.slice(0, 4) ?? []
  const defaultRecs = [
    'Keep drivers up to date',
    'Improve airflow — clean vents regularly',
    'Review battery health monthly',
    'Export a performance report after changes'
  ]
  const recs = recommendations.length > 0 ? recommendations : defaultRecs

  const drive = disk?.drives?.[0]
  const part = disk?.partitions?.[0]
  const usedStorage = part ? formatBytes(part.used) : 'N/A'
  const freeStorage = part ? formatBytes(part.size - part.used) : 'N/A'

  const defaultOut = audio?.devices?.find((d) => d.type?.toLowerCase().includes('out') && d.isDefault)
    ?? audio?.devices?.find((d) => d.type?.toLowerCase().includes('render') || d.type?.toLowerCase().includes('out'))
  const defaultIn = audio?.devices?.find((d) => d.type?.toLowerCase().includes('in') && d.isDefault)
    ?? audio?.devices?.find((d) => d.type?.toLowerCase().includes('capture') || d.type?.toLowerCase().includes('mic'))

  const updatedLabel = lastUpdated
    ? `Last updated: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : 'Last updated: —'

  return (
    <div className="dashboard dash-v42">
      <header className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-sub">Real-time overview of your laptop&apos;s health and performance.</p>
        </div>
        <div className="dash-live-pill">
          <span className="dash-live-dot" />
          <span>Live</span>
          <span className="dash-live-muted">Sensors active</span>
        </div>
      </header>

      <section className="dash-hero-grid">
        <article className="dash-panel dash-overall">
          <h2 className="dash-panel-title">Overall Health</h2>
          <div className="dash-overall-body">
            <ScoreRing
              score={overall}
              size={168}
              strokeWidth={12}
              showGrade
              showScoreLine
              label={statusLabel(overall)}
            />
            <p className="dash-overall-msg">{overallMessage(overall, grade)}</p>
          </div>
        </article>

        <article className="dash-panel dash-radar">
          <h2 className="dash-panel-title">Component Health</h2>
          <div className="dash-radar-wrap">
            {radarData.some((d) => d.score > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="var(--color-border-bright)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Health"
                    dataKey="score"
                    stroke="var(--color-accent-blue)"
                    fill="var(--color-accent-blue)"
                    fillOpacity={0.28}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="dash-empty">Collecting component scores…</div>
            )}
          </div>
        </article>

        <article className="dash-panel dash-recs">
          <h2 className="dash-panel-title">Recommendations</h2>
          <ul className="dash-rec-list">
            {recs.map((rec, i) => {
              const Icon = recIcon(rec)
              return (
                <li key={`${i}-${rec.slice(0, 24)}`} className="dash-rec-item">
                  <span className="dash-rec-icon"><Icon size={14} /></span>
                  <span>{rec}</span>
                </li>
              )
            })}
          </ul>
          {healthScore?.recommendations && healthScore.recommendations.length > 4 && (
            <p className="dash-rec-more">+{healthScore.recommendations.length - 4} more in module views</p>
          )}
        </article>
      </section>

      <section className="dash-detail-grid">
        <ModuleDetailCard
          icon={Battery}
          label="Battery"
          score={battery?.healthScore ?? 0}
          color="var(--color-accent-green)"
          rows={[
            { label: 'Health', value: battery?.healthPercent != null ? `${battery.healthPercent.toFixed(0)}%` : 'N/A' },
            { label: 'Cycles', value: battery?.cycleCount ? String(battery.cycleCount) : 'N/A' },
            {
              label: 'Remaining',
              value: battery?.isCharging
                ? 'Charging'
                : formatTimeRemaining(battery?.timeRemaining ?? null)
            }
          ]}
        />
        <ModuleDetailCard
          icon={Thermometer}
          label="Thermal"
          score={thermal?.thermalScore ?? 0}
          color="var(--color-accent-amber)"
          rows={[
            { label: 'CPU Temp', value: thermal?.cpuTemp != null ? `${thermal.cpuTemp.toFixed(0)} °C` : 'N/A' },
            { label: 'GPU Temp', value: thermal?.gpuTemp != null ? `${thermal.gpuTemp.toFixed(0)} °C` : 'N/A' },
            {
              label: 'Status',
              value: thermal?.isThrottling === true ? 'Throttling' : thermal?.isThrottling === false ? 'Normal' : 'Normal'
            }
          ]}
        />
        <ModuleDetailCard
          icon={HardDrive}
          label="Disk"
          score={disk?.overallDiskScore ?? 0}
          color="var(--color-accent-blue)"
          rows={[
            { label: 'Health', value: drive?.healthPercent != null ? `${drive.healthPercent}%` : (drive?.healthStatus || 'N/A') },
            { label: 'Used', value: usedStorage },
            { label: 'Free', value: freeStorage }
          ]}
        />
        <ModuleDetailCard
          icon={Cpu}
          label="CPU"
          score={cpuram?.overallScore ?? 0}
          color="var(--color-accent-cyan)"
          rows={[
            { label: 'Usage', value: cpuram ? `${cpuram.totalUsage.toFixed(0)}%` : 'N/A' },
            { label: 'Clock', value: cpuram?.currentSpeed ? `${cpuram.currentSpeed.toFixed(2)} GHz` : 'N/A' },
            { label: 'Cores', value: cpuram ? String(cpuram.physicalCores || cpuram.logicalCores) : 'N/A' }
          ]}
        />
        <ModuleDetailCard
          icon={Wifi}
          label="Network"
          score={network?.networkScore ?? 0}
          color="var(--color-accent-blue)"
          rows={[
            {
              label: 'Status',
              value: network?.connectionType === 'offline'
                ? 'Offline'
                : network?.connectionType === 'ethernet'
                  ? 'Connected'
                  : network?.wifiConnected
                    ? 'Connected'
                    : 'N/A'
            },
            {
              label: 'Speed',
              value: network?.downloadSpeed
                ? `${Math.round(network.downloadSpeed)} Mbps`
                : 'N/A'
            },
            {
              label: 'Signal',
              value: network?.connectionType === 'ethernet'
                ? 'LAN'
                : network?.wifiSignalPercent != null
                  ? (network.wifiSignalPercent >= 70 ? 'Excellent' : `${network.wifiSignalPercent}%`)
                  : 'N/A'
            }
          ]}
        />
        <ModuleDetailCard
          icon={Volume2}
          label="Audio"
          score={audio?.audioScore ?? 0}
          color="var(--color-accent-purple)"
          rows={[
            { label: 'Output', value: defaultOut?.name?.split('(')[0]?.trim() || 'Speakers' },
            { label: 'Input', value: defaultIn?.name?.split('(')[0]?.trim() || 'Microphone' },
            {
              label: 'Status',
              value: (audio?.devices?.length ?? 0) > 0 ? 'Active' : 'N/A'
            }
          ]}
        />
      </section>

      {(healthScore?.overall ?? 0) > 0 && (healthScore?.overall ?? 0) < 55 && (
        <div className="dash-alert">
          <AlertTriangle size={16} />
          <span>Overall health needs attention — open Recommendations and each module for details.</span>
        </div>
      )}

      <footer className="dash-footer">
        <div className="dash-footer-item">
          <span className="dash-footer-label">System</span>
          <span>{sysInfo.os || 'Windows'}</span>
        </div>
        <div className="dash-footer-item">
          <span className="dash-footer-label">Device</span>
          <span title={sysInfo.model}>{sysInfo.model || 'This PC'}</span>
        </div>
        <div className="dash-footer-item dash-footer-right">
          <span>{updatedLabel}</span>
          <button type="button" className="dash-refresh" onClick={() => fetchAll()} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </footer>
    </div>
  )
}
