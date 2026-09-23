import { useEffect, useCallback } from 'react'
import {
  Battery, Thermometer, HardDrive, Cpu, Volume2, Wifi, Monitor, AlertTriangle, CheckCircle
} from 'lucide-react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts'
import './Dashboard.css'

const lc = window.systemlens

// ─── Poll interval: 15 seconds ────────────────────────────────
// IPC handlers cache results on the main-process side (6–60s TTL)
// so most calls return immediately without hitting system APIs.
const POLL_MS = 15_000

function ModuleCard({
  icon: Icon, label, score, value, unit, color
}: {
  icon: React.ElementType
  label: string
  score: number
  value: string | number
  unit?: string
  color: string
}) {
  const getStatus = (s: number) =>
    s >= 85 ? 'Good' : s >= 70 ? 'Fair' : s >= 55 ? 'Caution' : s > 0 ? 'Poor' : 'Loading'

  const statusClass = (s: number) =>
    s >= 85 ? 'badge-green' : s >= 70 ? 'badge-blue' : s >= 55 ? 'badge-amber' : s > 0 ? 'badge-red' : 'badge-amber'

  return (
    <div className="module-card card" style={{ '--card-accent': color } as any}>
      <div className="module-card-header">
        <div className="module-icon-wrap" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <span className={`badge ${statusClass(score)}`}>{getStatus(score)}</span>
      </div>
      <div className="module-card-body">
        <div className="module-score-wrap">
          <ScoreRing score={score} size={72} strokeWidth={6} />
        </div>
        <div className="module-info">
          <span className="module-label">{label}</span>
          <span className="module-value">
            {value || 'N/A'}
            {unit && value ? <span className="module-unit"> {unit}</span> : null}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const {
    battery, thermal, disk, cpuram, network, audio, healthScore,
    setBattery, setThermal, setDisk, setCpuRam, setNetwork, setAudio,
    setHealthScore, setLoading
  } = useHealthStore()

  const fetchAll = useCallback(async () => {
    setLoading('dashboard', true)
    try {
      // Fetch all in parallel — each returns cached data from main process
      const [bat, therm, dsk, cpu, net, aud, score] = await Promise.all([
        lc?.battery?.get(),
        lc?.thermal?.get(),
        lc?.disk?.get(),
        lc?.cpuram?.get(),
        lc?.network?.get(),
        lc?.audio?.get(),
        lc?.health?.score()
      ])
      if (bat?.success)   setBattery(bat.data)
      if (therm?.success) setThermal(therm.data)
      if (dsk?.success)   setDisk(dsk.data)
      if (cpu?.success)   setCpuRam(cpu.data)
      if (net?.success)   setNetwork(net.data)
      if (aud?.success)   setAudio(aud.data)
      if (score?.success) setHealthScore(score.data)
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

  const radarData = healthScore ? [
    { subject: 'Battery', score: healthScore.battery  },
    { subject: 'Thermal', score: healthScore.thermal  },
    { subject: 'Storage', score: healthScore.disk     },
    { subject: 'CPU/RAM', score: healthScore.cpuram   },
    { subject: 'Network', score: healthScore.network  },
    { subject: 'Audio',   score: healthScore.audio    },
    { subject: 'Display', score: healthScore.display ?? 0 }
  ] : []

  return (
    <div className="dashboard">
      {/* Hero Score Section */}
      <section className="dashboard-hero card">
        <div className="hero-score-area">
          <ScoreRing
            score={healthScore?.overall ?? 0}
            size={160}
            strokeWidth={12}
            showGrade
            label="Overall Health"
          />
          <div className="hero-details">
            <h1 className="hero-title">Laptop Health Report</h1>
            <p className="hero-subtitle">Real-time diagnostics — updated every 15 seconds</p>
            <div className="hero-grade-row">
              <div className="grade-chip" data-grade={healthScore?.grade ?? '-'}>
                Grade {healthScore?.grade ?? 'N/A'}
              </div>
              <div className={`badge ${
                (healthScore?.overall ?? 0) >= 70 ? 'badge-green' :
                (healthScore?.overall ?? 0) >= 55 ? 'badge-amber' : 'badge-red'
              }`}>
                {(healthScore?.overall ?? 0) >= 70
                  ? <><CheckCircle size={10} /> Healthy</>
                  : <><AlertTriangle size={10} /> Needs Attention</>
                }
              </div>
            </div>
          </div>
        </div>

        {radarData.length > 0 && radarData.some((d) => d.score > 0) && (
          <div className="hero-radar">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'Inter' }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Health"
                  dataKey="score"
                  stroke="var(--color-accent-blue)"
                  fill="var(--color-accent-blue)"
                  fillOpacity={0.2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Module Cards Grid */}
      <section className="module-grid">
        <ModuleCard icon={Battery}     label="Battery Health" score={battery?.healthScore ?? 0}   value={battery?.healthPercent != null ? battery.healthPercent.toFixed(1) : 'N/A'} unit={battery?.healthPercent != null ? '%' : ''} color="var(--color-accent-green)"  />
        <ModuleCard
          icon={Thermometer}
          label={
            thermal?.cpuTempSource === 'package' || thermal?.cpuTempSource === 'ohm'
              ? 'CPU Temp'
              : thermal?.cpuTempSource === 'zone'
              ? 'System zone'
              : 'Thermal'
          }
          score={thermal?.thermalScore ?? 0}
          value={
            thermal?.cpuTempSource === 'package' || thermal?.cpuTempSource === 'ohm'
              ? (thermal?.cpuTemp != null ? thermal.cpuTemp.toFixed(1) : 'N/A')
              : thermal?.cpuTempSource === 'zone'
              ? (thermal?.systemZoneTemp != null ? thermal.systemZoneTemp.toFixed(1) : 'N/A')
              : (thermal?.gpuTemp != null ? thermal.gpuTemp.toFixed(1) : 'N/A')
          }
          unit={
            (thermal?.cpuTempSource === 'package' || thermal?.cpuTempSource === 'ohm') && thermal?.cpuTemp != null
              ? '°C'
              : thermal?.cpuTempSource === 'zone' && thermal?.systemZoneTemp != null
              ? '°C'
              : thermal?.gpuTemp != null
              ? '°C GPU'
              : ''
          }
          color="var(--color-accent-amber)"
        />
        <ModuleCard icon={HardDrive}   label="Storage"        score={disk?.overallDiskScore ?? 0}  value={disk?.drives?.[0]?.healthStatus ?? ''}        color="var(--color-accent-blue)"   />
        <ModuleCard icon={Cpu}         label="CPU & RAM"      score={cpuram?.overallScore ?? 0}    value={cpuram?.usedPercent?.toFixed(0) ?? ''}        unit="% RAM"   color="var(--color-accent-purple)" />
        <ModuleCard icon={Wifi}        label="Network"        score={network?.networkScore ?? 0}   value={network?.connectionType === 'ethernet' ? 'LAN' : (network?.wifiSignalPercent != null ? network.wifiSignalPercent.toFixed(0) : 'N/A')} unit={network?.connectionType === 'wifi' && network?.wifiSignalPercent != null ? '% signal' : ''} color="var(--color-accent-cyan)"   />
        <ModuleCard icon={Volume2}     label="Audio"          score={audio?.audioScore ?? 0}       value={audio?.devices?.length ?? 0}                  unit="devices" color="var(--color-accent-purple)" />
        <ModuleCard icon={Monitor}     label="Display"        score={healthScore?.display ?? 0}    value={healthScore?.display != null ? healthScore.display : 'N/A'} unit={healthScore?.display != null ? 'score' : ''} color="var(--color-accent-blue)" />
      </section>

      {/* Recommendations */}
      {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
        <section className="recommendations card">
          <h2 className="section-title">Recommendations</h2>
          <div className="rec-list">
            {healthScore.recommendations.map((rec, i) => (
              <div key={i} className="rec-item"><span>{rec}</span></div>
            ))}
          </div>
        </section>
      )}

      {/* Live Charging Status */}
      {battery && battery.hasBattery && (
        <section className="charging-section card">
          <h2 className="section-title">Charging Status</h2>
          <div className="charging-row">
            {[
              { label: 'Level',       value: `${battery.percent}%`,                  cls: 'text-green' },
              { label: 'Status',      value: battery.isCharging ? 'Charging' : (battery.acConnected ? 'Plugged In' : 'Discharging'), cls: battery.isCharging || battery.acConnected ? 'text-green' : 'text-amber' },
              { label: 'Power',       value: battery.chargingWatts != null && battery.chargingWatts > 0 ? `${battery.chargingWatts}W` : 'N/A', cls: 'text-blue' },
              { label: 'Health',      value: battery.healthPercent != null ? `${battery.healthPercent.toFixed(1)}%` : 'N/A',  cls: battery.healthPercent != null && battery.healthPercent >= 80 ? 'text-green' : battery.healthPercent != null && battery.healthPercent >= 50 ? 'text-amber' : 'text-red' },
              { label: 'Cycles',      value: battery.cycleCount > 0 ? String(battery.cycleCount) : 'N/A', cls: '' },
              { label: 'Voltage',     value: battery.voltage > 0 ? `${battery.voltage}V` : 'N/A', cls: '' }
            ].map(({ label, value, cls }) => (
              <div className="charging-stat" key={label}>
                <span className="stat-label">{label}</span>
                <span className={`stat-value ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="charge-bar-wrap">
            <div className="charge-bar-track">
              <div
                className="charge-bar-fill"
                style={{
                  width: `${battery.percent}%`,
                  background: battery.isCharging || battery.acConnected ? 'var(--gradient-green)' :
                    battery.percent < 20 ? 'var(--gradient-amber)' : 'var(--color-accent-blue)'
                }}
              />
            </div>
            <span className="charge-bar-label">{battery.percent}%</span>
          </div>
        </section>
      )}
    </div>
  )
}
