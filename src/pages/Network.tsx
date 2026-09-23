import { useEffect, useState } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Wifi, Cable, ArrowDown, ArrowUp, Gauge, Loader2 } from 'lucide-react'
import { formatBytes } from '../utils/formatters'
import './ModulePage.css'
import './Reports.css'

const lc = window.systemlens

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

function SignalBars({ percent }: { percent: number }) {
  const bars = [25, 50, 75, 100]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {bars.map((threshold, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: `${25 * (i + 1)}%`,
            borderRadius: 2,
            background: percent >= threshold
              ? 'var(--color-accent-blue)'
              : 'var(--color-bg-elevated)',
            transition: 'background 0.3s ease'
          }}
        />
      ))}
    </div>
  )
}

export default function Network() {
  const { network, setNetwork } = useHealthStore()
  const [testing, setTesting] = useState(false)
  const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null)
  const [speedError, setSpeedError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const res = await lc?.network?.get()
      if (res?.success) setNetwork(res.data)
    }
    fetchData()
    const id = setInterval(fetchData, 15000)
    return () => clearInterval(id)
  }, [])

  const onSpeedTest = async () => {
    setTesting(true)
    setSpeedError(null)
    try {
      const res = await lc?.network?.speedTest()
      if (!res?.success) {
        throw new Error(res && 'error' in res ? res.error : 'Speed test failed')
      }
      setSpeedResult(res.data)
    } catch (err) {
      setSpeedResult(null)
      setSpeedError(err instanceof Error ? err.message : String(err))
    } finally {
      setTesting(false)
    }
  }

  const n = network
  const conn = n?.connectionType ?? (n?.wifiConnected ? 'wifi' : 'offline')
  const subtitle =
    conn === 'wifi' && n?.wifiSsid ? `Connected to ${n.wifiSsid}` :
    conn === 'ethernet' ? 'Ethernet connected' :
    'No active connection'

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(34,211,238,0.1)' }}>
          {conn === 'ethernet'
            ? <Cable size={24} color="var(--color-accent-cyan)" />
            : <Wifi size={24} color="var(--color-accent-cyan)" />}
        </div>
        <div>
          <h1 className="module-title">Network</h1>
          <p className="module-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={n?.networkScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Signal</span>
              {conn === 'wifi' && n?.wifiSignalPercent != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SignalBars percent={n.wifiSignalPercent} />
                  <span className="stat-value text-blue">{n.wifiSignalPercent.toFixed(0)}%</span>
                </div>
              ) : (
                <span className="stat-value text-muted">{conn === 'ethernet' ? 'Wired' : 'N/A'}</span>
              )}
            </div>
            <div className="stat-item">
              <span className="stat-label">Band</span>
              <span className="stat-value">{conn === 'wifi' ? (n?.wifiBand ?? 'N/A') : '—'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Download</span>
              <span className="stat-value text-green">
                <ArrowDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}{n?.downloadSpeed != null ? formatBytes(n.downloadSpeed) + '/s' : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Upload</span>
              <span className="stat-value text-purple">
                <ArrowUp size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}{n?.uploadSpeed != null ? formatBytes(n.uploadSpeed) + '/s' : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ping</span>
              <span className={`stat-value ${n?.pingMs && n.pingMs > 100 ? 'text-amber' : 'text-green'}`}>
                {n?.pingMs != null ? `${n.pingMs} ms` : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className={`stat-value ${conn !== 'offline' ? 'text-green' : 'text-red'}`}>
                {conn === 'wifi' ? 'Wi-Fi' : conn === 'ethernet' ? 'Ethernet' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 className="card-section-title" style={{ marginBottom: 4 }}>Speed test</h2>
            <p className="stat-label" style={{ margin: 0 }}>
              Measures download, upload, and latency via Cloudflare
            </p>
          </div>
          <button
            className="export-btn export-btn-primary"
            onClick={onSpeedTest}
            disabled={testing || conn === 'offline'}
            title={conn === 'offline' ? 'Connect to the internet first' : 'Run speed test'}
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Gauge size={16} />}
            {testing ? 'Testing…' : 'Run speed test'}
          </button>
        </div>

        {speedError && (
          <p style={{ color: 'var(--color-accent-red)', fontSize: 13, marginBottom: 12 }}>{speedError}</p>
        )}

        {speedResult && (
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Download</span>
              <span className="stat-value text-green">{speedResult.downloadMbps} Mbps</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Upload</span>
              <span className="stat-value text-purple">{speedResult.uploadMbps} Mbps</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Latency</span>
              <span className="stat-value text-blue">{speedResult.latencyMs} ms</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Server</span>
              <span className="stat-value">{speedResult.server}</span>
            </div>
          </div>
        )}

        {!speedResult && !speedError && !testing && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
            Live adapter rates above are instantaneous. Use speed test for a full link measurement.
          </p>
        )}
      </div>
    </div>
  )
}
