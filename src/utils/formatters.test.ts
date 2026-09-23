import { describe, it, expect } from 'vitest'
import { formatBytes, formatDuration, scoreToColor, scoreToGrade, clamp } from './formatters'

describe('formatters', () => {
  it('formatBytes handles zero and gigabytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('formatDuration formats hours and minutes', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(125)).toBe('2h 5m')
    expect(formatDuration(-1)).toBe('Unknown')
  })

  it('scoreToGrade matches thresholds', () => {
    expect(scoreToGrade(90)).toBe('A')
    expect(scoreToGrade(75)).toBe('B')
    expect(scoreToGrade(60)).toBe('C')
    expect(scoreToGrade(45)).toBe('D')
    expect(scoreToGrade(10)).toBe('F')
  })

  it('scoreToColor returns CSS vars for bands', () => {
    expect(scoreToColor(90)).toContain('green')
    expect(scoreToColor(75)).toContain('blue')
    expect(scoreToColor(60)).toContain('amber')
    expect(scoreToColor(30)).toContain('red')
  })

  it('clamp bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})
