import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Thermometer, Wind, AlertTriangle, Info } from 'lucide-react'
import './ModulePage.css'

const lc = window.systemlens

function getTempColor(temp: number | null | undefined): string {
  if (temp == null || temp <= 0) return 'var(--color-text-muted)'
  if (temp <= 60) return 'var(--color-accent-green)'
  if (temp <= 75) return 'var(--color-accent-blue)'
  if (temp <= 85) return 'var(--color-accent-amber)'
  return 'var(--color-accent-red)'
}

function formatTemp(temp: number | null | undefined): string {
  if (temp == null || Number.isNaN(temp)) return 'N/A'
  return `${temp.toFixed(1)}°C`
}

function hasReliableCpu(source: string | undefined): boolean {
  return source === 'package' || source === 'ohm'
}

export default function Thermal() {
  const { thermal, setThermal } = useHealthStore()

  useEffect(() => {
    const fetchData = async () => {
      const res = await lc?.thermal?.get()
      if (res?.success) setThermal(res.data)
    }
    fetchData()
    const id = setInterval(fetchData, 15000)
    return () => clearInterval(id)
  }, [])

  const t = thermal
  const reliableCpu = hasReliableCpu(t?.cpuTempSource)
  const hasCores = (t?.cpuTempPerCore?.length ?? 0) > 0
  const hasZones = (t?.zones?.length ?? 0) > 0
  const weakSensors = !reliableCpu

  const cpuLabel = reliableCpu ? 'CPU Temp' : t?.cpuTempSource === 'zone' ? 'System zone' : 'CPU Temp'
  const cpuDisplay = reliableCpu
    ? t?.cpuTemp
    : t?.cpuTempSource === 'zone'
    ? t?.systemZoneTemp ?? null
    : null

  const subtitle = reliableCpu
    ? 'CPU package and GPU temperatures'
    : 'Limited sensors — install LibreHardwareMonitor for package CPU temps'

  const throttleLabel =
    t?.isThrottling === true ? 'Yes' : t?.isThrottling === false ? 'No' : 'Unknown'
  const throttleClass =
    t?.isThrottling === true ? 'text-red' : t?.isThrottling === false ? 'text-green' : 'text-muted'

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Thermometer size={24} color="var(--color-accent-amber)" />
        </div>
        <div>
          <h1 className="module-title">Thermal Monitor</h1>
          <p className="module-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={t?.thermalScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">{cpuLabel}</span>
              <span className="stat-value" style={{ color: getTempColor(cpuDisplay) }}>
                {formatTemp(cpuDisplay)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">GPU Temp</span>
              <span className="stat-value" style={{ color: getTempColor(t?.gpuTemp) }}>
                {formatTemp(t?.gpuTemp)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Temp</span>
              <span className="stat-value" style={{ color: getTempColor(t?.maxTemp) }}>
                {formatTemp(t?.maxTemp)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Throttling</span>
              <span className={`stat-value ${throttleClass}`}>{throttleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {weakSensors && (
        <div className="card warning-card">
          <Info size={18} color="var(--color-accent-amber)" />
          <div>
            <p className="warning-title">CPU package temperature unavailable</p>
            <p className="warning-desc">
              Windows ACPI zones are not the CPU die. Install LibreHardwareMonitor and enable its
              remote/WMI access for accurate package CPU temps. Showing system zones and GPU when present.
            </p>
          </div>
        </div>
      )}

      {hasCores && (
        <div className="card">
          <h2 className="card-section-title">Per-Core Temperatures</h2>
          <div className="core-grid">
            {t!.cpuTempPerCore.map((temp, i) => (
              <div key={i} className="core-item">
                <span className="core-label">Core {i}</span>
                <div className="core-bar-track">
                  <div
                    className="core-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, temp))}%`,
                      background: getTempColor(temp)
                    }}
                  />
                </div>
                <span className="core-temp" style={{ color: getTempColor(temp) }}>
                  {temp.toFixed(0)}°C
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasZones && (
        <div className="card">
          <h2 className="card-section-title">Thermal Zones (ACPI)</h2>
          <div className="core-grid">
            {t!.zones!.map((z, i) => (
              <div key={i} className="core-item">
                <span className="core-label">{z.name.replace(/^\\+/, '') || `Zone ${i}`}</span>
                <div className="core-bar-track">
                  <div
                    className="core-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, z.temp))}%`,
                      background: getTempColor(z.temp)
                    }}
                  />
                </div>
                <span className="core-temp" style={{ color: getTempColor(z.temp) }}>
                  {z.temp.toFixed(0)}°C
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {t && t.fanSpeeds.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Fan Speeds</h2>
          <div className="core-grid">
            {t.fanSpeeds.map((rpm, i) => (
              <div key={i} className="core-item">
                <Wind size={14} color="var(--color-accent-blue)" />
                <span className="core-label">Fan {i + 1}</span>
                <span className="core-temp text-blue">{rpm > 0 ? `${rpm} RPM` : 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {t?.isThrottling === true && (
        <div className="card warning-card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={18} color="var(--color-accent-red)" />
          <div>
            <p className="warning-title" style={{ color: 'var(--color-accent-red)' }}>Thermal Throttling Detected</p>
            <p className="warning-desc">
              Performance may be limited to prevent overheating. Clean vents and check cooling.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
