import './ScoreRing.css'

interface Props {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  showGrade?: boolean
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
  showGrade = false
}: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)
  const grade = getGrade(score)

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring-svg">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-elevated)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
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
          <span className="score-grade" style={{ color }}>{grade}</span>
        ) : (
          <span className="score-number" style={{ color }}>{score}</span>
        )}
        {label && <span className="score-label">{label}</span>}
        {sublabel && <span className="score-sublabel">{sublabel}</span>}
      </div>
    </div>
  )
}
