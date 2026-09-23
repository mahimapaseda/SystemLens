import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Battery as BatteryIcon, AlertTriangle } from 'lucide-react'
import './ModulePage.css'

const lc = window.systemlens

export default function Battery() {
  const { battery, setBattery } = useHealthStore()

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.battery?.get()
      if (res?.success) setBattery(res.data)
    }
    fetch()
    const id = setInterval(fetch, 12000)
    return () => clearInterval(id)
  }, [])

  const b = battery

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(34,211,165,0.1)' }}>
          <BatteryIcon size={24} color="var(--color-accent-green)" />
        </div>
        <div>
          <h1 className="module-title">Battery Health</h1>
          <p className="module-subtitle">{b?.manufacturer} · {b?.model}</p>
        </div>
      </div>

      {/* Top stats row */}
      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={b?.healthScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Health</span>
              <span className="stat-value text-green">{b?.healthPercent != null ? `${b.healthPercent.toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Charge Level</span>
              <span className="stat-value">{b?.percent ?? 'N/A'}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className={`stat-value ${b?.isCharging || b?.acConnected ? 'text-green' : 'text-amber'}`}>
                {b?.isCharging ? 'Charging' : (b?.acConnected ? 'Plugged In' : 'Discharging')}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Power</span>
              <span className="stat-value text-blue">{b?.chargingWatts != null ? `${b.chargingWatts}W` : 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Voltage</span>
              <span className="stat-value">{b?.voltage ?? 'N/A'}V</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Cycle Count</span>
              <span className="stat-value">{b?.cycleCount ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Design Cap.</span>
              <span className="stat-value">{b?.designCapacity ? `${b.designCapacity} mWh` : 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Full Charge Cap.</span>
              <span className="stat-value">{b?.fullChargeCapacity ? `${b.fullChargeCapacity} mWh` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charge bar */}
      <div className="card">
        <h2 className="card-section-title">Current Charge</h2>
        <div className="big-charge-bar-track">
          <div
            className="big-charge-bar-fill"
            style={{
              width: `${b?.percent ?? 0}%`,
              background: b?.isCharging ? 'var(--gradient-green)' : b && b.percent < 20 ? 'var(--gradient-amber)' : 'var(--color-accent-blue)'
            }}
          />
        </div>
        <div className="charge-labels">
          <span className="stat-label">0%</span>
          <span className="stat-value">{b?.percent ?? 0}%</span>
          <span className="stat-label">100%</span>
        </div>
      </div>

      {/* Capacity visualization */}
      {b && b.designCapacity > 0 && b.fullChargeCapacity > 0 && (
        <div className="card">
          <h2 className="card-section-title">Capacity Analysis</h2>
          <div className="capacity-bars">
            <div className="capacity-bar-item">
              <span className="stat-label">Design Capacity</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: '100%', background: 'var(--color-bg-hover)' }} />
              </div>
              <span className="bar-value">{b.designCapacity} mWh</span>
            </div>
            <div className="capacity-bar-item">
              <span className="stat-label">Full Charge Capacity</span>
              <div className="bar-track">
                <div className="bar-fill" style={{
                  width: `${(b.fullChargeCapacity / b.designCapacity) * 100}%`,
                  background: (b.healthPercent ?? 0) >= 80 ? 'var(--color-accent-green)' : (b.healthPercent ?? 0) >= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)'
                }} />
              </div>
              <span className="bar-value">
                {b.fullChargeCapacity} mWh
                {b.healthPercent != null ? ` (${b.healthPercent.toFixed(1)}%)` : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      {b && b.healthPercent != null && b.healthPercent < 60 && (
        <div className="card warning-card">
          <AlertTriangle size={18} color="var(--color-accent-amber)" />
          <div>
            <p className="warning-title">Battery Health Declining</p>
            <p className="warning-desc">
              Your battery is at {b.healthPercent.toFixed(1)}% health.
              {b.healthPercent < 40
                ? ' Consider replacing the battery soon.'
                : ' Monitor closely and plan for replacement.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
