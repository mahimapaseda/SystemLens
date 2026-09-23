import { useEffect, useState } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Volume2, Mic, Bluetooth, Loader2, Play } from 'lucide-react'
import { playSpeakerTest, runMicrophoneTest, type MicTestResult } from '../utils/audio-test'
import './ModulePage.css'
import './Reports.css'

const lc = window.systemlens

const TYPE_ICONS: Record<string, React.ElementType> = {
  Speaker: Volume2,
  Microphone: Mic,
  Headphone: Volume2,
  Bluetooth: Bluetooth,
  'USB Audio': Volume2,
  Other: Volume2
}

export default function Audio() {
  const { audio, setAudio } = useHealthStore()
  const [speakerBusy, setSpeakerBusy] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [speakerMsg, setSpeakerMsg] = useState<string | null>(null)
  const [micResult, setMicResult] = useState<MicTestResult | null>(null)
  const [micError, setMicError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.audio?.get()
      if (res?.success) setAudio(res.data)
    }
    fetch()
    const id = setInterval(fetch, 60000)
    return () => clearInterval(id)
  }, [])

  const onSpeakerTest = async () => {
    setSpeakerBusy(true)
    setSpeakerMsg(null)
    try {
      await playSpeakerTest()
      setSpeakerMsg('Tone played on the default output device. If you heard a beep, speakers are working.')
    } catch (err) {
      setSpeakerMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setSpeakerBusy(false)
    }
  }

  const onMicTest = async () => {
    setMicBusy(true)
    setMicError(null)
    setMicResult(null)
    try {
      const result = await runMicrophoneTest()
      setMicResult(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMicError(
        /Permission|NotAllowed|denied/i.test(msg)
          ? 'Microphone permission denied. Allow mic access for SystemLens in Windows settings.'
          : msg
      )
    } finally {
      setMicBusy(false)
    }
  }

  const a = audio

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
          <Volume2 size={24} color="var(--color-accent-purple)" />
        </div>
        <div>
          <h1 className="module-title">Audio Health</h1>
          <p className="module-subtitle">Sound devices, drivers, and quick tests</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={a?.audioScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total Devices</span>
              <span className="stat-value">{a?.devices?.length ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active</span>
              <span className="stat-value text-green">
                {a?.devices?.filter((d) => d.status === 'active').length ?? 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-section-title">Audio tests</h2>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          <div className="stat-item" style={{ gap: 10 }}>
            <span className="stat-label">Speaker test</span>
            <button
              className="export-btn export-btn-primary"
              onClick={onSpeakerTest}
              disabled={speakerBusy}
              style={{ width: 'fit-content' }}
            >
              {speakerBusy ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {speakerBusy ? 'Playing…' : 'Play test tone'}
            </button>
            {speakerMsg && (
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{speakerMsg}</span>
            )}
          </div>
          <div className="stat-item" style={{ gap: 10 }}>
            <span className="stat-label">Microphone test</span>
            <button
              className="export-btn export-btn-primary"
              onClick={onMicTest}
              disabled={micBusy}
              style={{ width: 'fit-content' }}
            >
              {micBusy ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
              {micBusy ? 'Listening…' : 'Test microphone'}
            </button>
            {micError && (
              <span style={{ fontSize: 12, color: 'var(--color-accent-red)' }}>{micError}</span>
            )}
            {micResult && (
              <span style={{ fontSize: 12, color: micResult.passed ? 'var(--color-accent-green)' : 'var(--color-accent-amber)' }}>
                {micResult.passed
                  ? `Mic OK — peak ${micResult.peakLevel}%, avg ${micResult.avgLevel}%`
                  : `Low input — peak ${micResult.peakLevel}%. Speak louder or check the mic.`}
              </span>
            )}
          </div>
        </div>
      </div>

      {a?.devices && a.devices.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Audio Devices</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Manufacturer</th>
                <th>Status</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {a.devices.map((dev, i) => {
                const Icon = TYPE_ICONS[dev.type] ?? Volume2
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} />
                        {dev.name}
                      </span>
                    </td>
                    <td>{dev.type}</td>
                    <td>{dev.manufacturer}</td>
                    <td>
                      <span className={`badge ${dev.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td>
                      {dev.isDefault && <span className="badge badge-blue">Default</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
