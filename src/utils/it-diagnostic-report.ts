import jsPDF from 'jspdf'
import autoTableImport from 'jspdf-autotable'

const autoTable =
  typeof autoTableImport === 'function'
    ? autoTableImport
    : (autoTableImport as { default: typeof autoTableImport }).default

function lastTableY(doc: jsPDF, fallback: number): number {
  const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
  return typeof y === 'number' ? y : fallback
}

function downloadPdfBlob(doc: jsPDF, filename: string): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export interface DiagnosticHistoryRow {
  id: number
  timestamp: string
  overall_score: number
  battery_score: number
  thermal_score: number
  disk_score: number
  cpuram_score: number
  battery_health_percent: number
  cpu_temp: number
  ram_used_percent: number
}

type Severity = 'Healthy' | 'Attention' | 'Critical'

const COLORS = {
  ink: [15, 23, 42] as [number, number, number],
  slate: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  line: [226, 232, 240] as [number, number, number],
  soft: [248, 250, 252] as [number, number, number],
  teal: [13, 148, 136] as [number, number, number],
  tealDeep: [15, 118, 110] as [number, number, number],
  white: [255, 255, 255] as [number, number, number]
}

function severityFromScore(score: number): Severity {
  if (score >= 70) return 'Healthy'
  if (score >= 40) return 'Attention'
  return 'Critical'
}

function severityColor(s: Severity): [number, number, number] {
  if (s === 'Healthy') return [16, 185, 129]
  if (s === 'Attention') return [245, 158, 11]
  return [239, 68, 68]
}

function gradeFromScore(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function minMax(nums: number[]): { min: number; max: number } {
  if (nums.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

function buildFindings(latest: DiagnosticHistoryRow): { area: string; status: Severity; detail: string }[] {
  const battSev: Severity =
    latest.battery_health_percent > 0 && latest.battery_health_percent < 40
      ? 'Critical'
      : latest.battery_health_percent > 0 && latest.battery_health_percent < 60
      ? 'Attention'
      : severityFromScore(latest.battery_score)

  const thermSev: Severity =
    latest.cpu_temp > 90 ? 'Critical' : latest.cpu_temp > 80 ? 'Attention' : severityFromScore(latest.thermal_score)

  const ramSev: Severity =
    latest.ram_used_percent > 90
      ? 'Critical'
      : latest.ram_used_percent > 85
      ? 'Attention'
      : severityFromScore(latest.cpuram_score)

  return [
    {
      area: 'Overall',
      status: severityFromScore(latest.overall_score),
      detail: `Score ${latest.overall_score}/100 · Grade ${gradeFromScore(latest.overall_score)}`
    },
    {
      area: 'Battery',
      status: battSev,
      detail:
        latest.battery_health_percent > 0
          ? `Wear ${latest.battery_health_percent.toFixed(1)}% · Score ${latest.battery_score}`
          : `Score ${latest.battery_score} · Wear data N/A`
    },
    {
      area: 'Thermal',
      status: thermSev,
      detail: `${latest.cpu_temp.toFixed(1)} C · Score ${latest.thermal_score}`
    },
    {
      area: 'Storage',
      status: severityFromScore(latest.disk_score),
      detail: `Health score ${latest.disk_score}`
    },
    {
      area: 'CPU / RAM',
      status: ramSev,
      detail: `RAM ${latest.ram_used_percent.toFixed(1)}% · Score ${latest.cpuram_score}`
    }
  ]
}

function buildActions(findings: { area: string; status: Severity; detail: string }[]): string[] {
  const actions: string[] = []
  for (const f of findings) {
    if (f.status === 'Healthy') continue
    if (f.area === 'Battery') {
      actions.push('Run powercfg /batteryreport and plan battery replacement if wear is under 60%.')
    } else if (f.area === 'Thermal') {
      actions.push('Clear vents, verify fans, compare package temp in LibreHardwareMonitor if available.')
    } else if (f.area === 'Storage') {
      actions.push('Check Get-PhysicalDisk health, free disk space, and back up if status is Caution/Bad.')
    } else if (f.area === 'CPU / RAM') {
      actions.push('Review Task Manager for memory hogs; consider RAM upgrade if sustained above 85%.')
    } else if (f.area === 'Overall') {
      actions.push('Resolve Critical/Attention subsystems before closing the support ticket.')
    }
  }
  if (actions.length === 0) {
    actions.push('No urgent remediation. Continue routine monitoring.')
  }
  return actions
}

function drawScoreCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: [number, number, number]
): void {
  doc.setFillColor(...COLORS.soft)
  doc.setDrawColor(...COLORS.line)
  doc.roundedRect(x, y, w, h, 2, 2, 'FD')
  doc.setFillColor(...accent)
  doc.rect(x, y, 1.5, h, 'F')
  doc.setTextColor(...COLORS.muted)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(label.toUpperCase(), x + 5, y + 6)
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(value, x + 5, y + 15)
}

/**
 * Attractive IT diagnostic PDF (no historical telemetry table).
 */
export function generateItDiagnosticPdf(history: DiagnosticHistoryRow[], windowDays: number): boolean {
  if (history.length === 0) {
    throw new Error('No health snapshots available to export.')
  }
  if (typeof autoTable !== 'function') {
    throw new Error('PDF table plugin failed to load. Reinstall SystemLens or restart the app.')
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const latest = sorted[sorted.length - 1]
  const oldest = sorted[0]
  const overallSev = severityFromScore(latest.overall_score)
  const sevRgb = severityColor(overallSev)
  const reportId = `LC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(latest.id).padStart(4, '0')}`
  const generatedAt = new Date()
  const periodAvg = avg(sorted.map((r) => r.overall_score))
  const periodRange = minMax(sorted.map((r) => r.overall_score))

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 16

  // Hero header
  doc.setFillColor(...COLORS.tealDeep)
  doc.rect(0, 0, pageW, 42, 'F')
  doc.setFillColor(...COLORS.teal)
  doc.rect(0, 42, pageW, 3, 'F')

  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('SystemLens', margin, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Laptop Health Diagnostic Report', margin, 23)
  doc.setFontSize(8)
  doc.text('IT Technical Support  |  Internal use only', margin, 30)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(reportId, pageW - margin, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(generatedAt.toLocaleString(), pageW - margin, 22, { align: 'right' })
  doc.text(
    `Window: last ${windowDays === 1 ? '24h' : `${windowDays}d`}  ·  ${sorted.length} snapshots`,
    pageW - margin,
    28,
    { align: 'right' }
  )

  // Status pill
  let y = 54
  doc.setFillColor(...sevRgb)
  doc.roundedRect(margin, y, 36, 9, 2, 2, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(overallSev.toUpperCase(), margin + 18, y + 6, { align: 'center' })

  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Overall ${latest.overall_score}/100  ·  Grade ${gradeFromScore(latest.overall_score)}`, margin + 42, y + 6)

  y = 70
  const cardW = (pageW - margin * 2 - 9) / 4
  const cardH = 20
  drawScoreCard(doc, margin, y, cardW, cardH, 'Battery', String(latest.battery_score), COLORS.teal)
  drawScoreCard(doc, margin + cardW + 3, y, cardW, cardH, 'Thermal', String(latest.thermal_score), [245, 158, 11])
  drawScoreCard(doc, margin + (cardW + 3) * 2, y, cardW, cardH, 'Storage', String(latest.disk_score), [59, 130, 246])
  drawScoreCard(doc, margin + (cardW + 3) * 3, y, cardW, cardH, 'CPU/RAM', String(latest.cpuram_score), [139, 92, 246])

  y = 98
  doc.setFillColor(...COLORS.soft)
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 2, 2, 'F')
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Executive summary', margin + 5, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.slate)
  const summary =
    overallSev === 'Healthy'
      ? `Endpoint is within acceptable ranges. Period average ${periodAvg}/100 (range ${periodRange.min}-${periodRange.max}). Observed ${new Date(oldest.timestamp).toLocaleDateString()} to ${new Date(latest.timestamp).toLocaleDateString()}.`
      : overallSev === 'Attention'
      ? `Attention required on one or more subsystems. Period average ${periodAvg}/100 (range ${periodRange.min}-${periodRange.max}). Review findings and technician actions below.`
      : `Critical indicators detected. Period average ${periodAvg}/100 (range ${periodRange.min}-${periodRange.max}). Prioritize remediation and data protection before returning the device.`
  const summaryLines = doc.splitTextToSize(summary, pageW - margin * 2 - 10)
  doc.text(summaryLines, margin + 5, y + 13)

  y = 134
  doc.setTextColor(...COLORS.ink)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Subsystem findings', margin, y)
  doc.setDrawColor(...COLORS.teal)
  doc.setLineWidth(0.6)
  doc.line(margin, y + 2, margin + 38, y + 2)

  const findings = buildFindings(latest)
  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin },
    head: [['Subsystem', 'Status', 'Key metrics']],
    body: findings.map((f) => [f.area, f.status, f.detail]),
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.tealDeep,
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3
    },
    styles: { fontSize: 8, cellPadding: 3, valign: 'middle', lineColor: COLORS.line, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: COLORS.soft },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: COLORS.ink },
      1: { cellWidth: 26 },
      2: { cellWidth: 'auto', textColor: COLORS.slate }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const status = String(data.cell.raw) as Severity
        data.cell.styles.textColor = severityColor(status)
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  y = lastTableY(doc, y) + 12

  // Key readings strip
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.ink)
  doc.text('Key readings (latest)', margin, y)
  doc.setDrawColor(...COLORS.teal)
  doc.line(margin, y + 2, margin + 42, y + 2)
  y += 8

  const readings = [
    ['Batt wear', latest.battery_health_percent > 0 ? `${latest.battery_health_percent.toFixed(1)}%` : 'N/A'],
    ['Temperature', `${latest.cpu_temp.toFixed(1)} C`],
    ['RAM used', `${latest.ram_used_percent.toFixed(1)}%`],
    ['Snapshots', String(sorted.length)]
  ]
  const rw = (pageW - margin * 2 - 9) / 4
  readings.forEach(([label, value], i) => {
    const x = margin + i * (rw + 3)
    doc.setFillColor(...COLORS.white)
    doc.setDrawColor(...COLORS.line)
    doc.roundedRect(x, y, rw, 16, 2, 2, 'FD')
    doc.setTextColor(...COLORS.muted)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(label.toUpperCase(), x + 3, y + 5)
    doc.setTextColor(...COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(value, x + 3, y + 12)
  })

  y += 26

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.ink)
  doc.text('Technician actions', margin, y)
  doc.setDrawColor(...COLORS.teal)
  doc.line(margin, y + 2, margin + 40, y + 2)
  y += 8

  const actions = buildActions(findings)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.slate)
  for (let i = 0; i < actions.length; i++) {
    const boxH = 10
    if (y + boxH > 270) {
      doc.addPage()
      y = 20
    }
    doc.setFillColor(i % 2 === 0 ? COLORS.soft[0] : 255, i % 2 === 0 ? COLORS.soft[1] : 255, i % 2 === 0 ? COLORS.soft[2] : 255)
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 1.5, 1.5, 'F')
    doc.setFillColor(...COLORS.teal)
    doc.circle(margin + 5, y + 5, 2.2, 'F')
    doc.setTextColor(...COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(String(i + 1), margin + 5, y + 6.2, { align: 'center' })
    doc.setTextColor(...COLORS.slate)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(actions[i], pageW - margin * 2 - 14)
    doc.text(lines[0], margin + 10, y + 6)
    y += boxH + 2
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(...COLORS.line)
    doc.line(margin, 285, pageW - margin, 285)
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'SystemLens local telemetry. Confirm Critical findings with OEM tools before hardware replacement.',
      margin,
      290
    )
    doc.text(`${reportId}  ·  p.${p}/${pageCount}`, pageW - margin, 290, { align: 'right' })
  }

  downloadPdfBlob(doc, `SystemLens-IT-Diagnostic-${reportId}.pdf`)
  return true
}
