import './ScoreRing.css'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  showGrade?: boolean
  /** When true with showGrade, also show "88 / 100" under the letter */
  showScoreLine?: boolean
}

function getGrade(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'var(--color-accent-green)'
  if (score >= 70) return 'var(--color-accent-blue)'
  if (score >= 55) return 'var(--color-accent-amber)'
  if (score >= 40) return '#f97316'
  return 'var(--color-accent-red)'
}

export default function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  showGrade = false,
  showScoreLine = false
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference
  const color = getScoreColor(score)
  const grade = getGrade(score)
  const gradeSize = Math.round(size * 0.28)
  const scoreLineSize = Math.round(size * 0.09)

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-elevated)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>

      <div className="score-ring-inner">
        {showGrade ? (
          <>
            <span className="score-grade" style={{ color, fontSize: gradeSize }}>{grade}</span>
            {showScoreLine && (
              <span className="score-line" style={{ fontSize: scoreLineSize }}>
                {Math.round(score)} / 100
              </span>
            )}
          </>
        ) : (
          <span className="score-number" style={{ color }}>{Math.round(score)}</span>
        )}
        {label && <span className="score-label">{label}</span>}
        {sublabel && <span className="score-sublabel">{sublabel}</span>}
      </div>
    </div>
  )
}
