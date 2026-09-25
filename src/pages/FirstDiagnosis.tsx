import { useEffect, useState } from 'react'
import { Minus, Square, X, Check } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import './FirstDiagnosis.css'

const lc = window.systemlens

const STEPS = [
  { step: 'battery', label: 'Battery' },
  { step: 'thermal', label: 'Thermal' },
  { step: 'disk', label: 'Storage' },
  { step: 'cpuram', label: 'CPU & RAM' },
  { step: 'network', label: 'Network' },
  { step: 'audio', label: 'Audio' },
  { step: 'display', label: 'Display' }
]

type StepState = 'pending' | 'running' | 'done'

interface Props {
  onOpen: () => void
}

export default function FirstDiagnosis({ onOpen }: Props) {
  const [states, setStates] = useState<Record<string, StepState>>({})
  const [score, setScore] = useState<{ overall: number; grade: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const off = lc?.setup?.onProgress?.((progress) => {
      setStates((prev) => ({
        ...prev,
        [progress.step]: progress.done ? 'done' : 'running'
      }))
    })

    let cancelled = false
    lc?.setup?.diagnose?.()
      .then((res) => {
        if (cancelled) return
        if (res?.success) {
          setScore({ overall: res.data.overall, grade: res.data.grade })
          setStates((prev) => {
            const next = { ...prev }
            for (const step of STEPS) next[step.step] = 'done'
            return next
          })
        } else {
          setError(res?.error || 'Diagnosis failed')
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e))
      })

    return () => {
      cancelled = true
      off?.()
    }
  }, [])

  const win = lc?.window

  return (
    <div className="first-dx">
      <header className="first-dx-bar" data-drag-region>
        <div className="first-dx-brand">
          <img src={logoUrl} alt="" width={28} height={28} />
          <span>SystemLens</span>
        </div>
        <div className="first-dx-controls">
          <button type="button" onClick={() => win?.minimize()} aria-label="Minimize"><Minus size={12} /></button>
          <button type="button" onClick={() => win?.maximize()} aria-label="Maximize"><Square size={11} /></button>
          <button type="button" className="first-dx-close" onClick={() => win?.close()} aria-label="Close"><X size={12} /></button>
        </div>
      </header>

      <main className="first-dx-body">
        <h1>Diagnosing this PC</h1>
        <p className="first-dx-lead">First-time health check before the dashboard.</p>

        <ol className="first-dx-list">
          {STEPS.map((step) => {
            const state = states[step.step] ?? 'pending'
            return (
              <li key={step.step} data-state={state}>
                <span className="first-dx-mark" aria-hidden="true">
                  {state === 'done' ? <Check size={14} /> : null}
                </span>
                <span>{step.label}</span>
                <span className="first-dx-status">
                  {state === 'running' ? 'Scanning' : state === 'done' ? 'Done' : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ol>

        {error && <p className="first-dx-error">{error}</p>}

        {score && (
          <div className="first-dx-result">
            <p>Grade {score.grade} · {Math.round(score.overall)} / 100</p>
            <button type="button" className="first-dx-open" onClick={onOpen}>
              Open SystemLens
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
