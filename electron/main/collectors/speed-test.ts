import { randomBytes } from 'crypto'

export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
  server: string
}

const CF_DOWN = 'https://speed.cloudflare.com/__down'
const CF_UP = 'https://speed.cloudflare.com/__up'
const DOWNLOAD_BYTES = 5_000_000
const UPLOAD_BYTES = 1_000_000

function mbps(bytes: number, ms: number): number {
  if (ms <= 0) return 0
  return Math.round(((bytes * 8) / (ms / 1000) / 1_000_000) * 10) / 10
}

async function measureLatency(): Promise<number> {
  const samples: number[] = []
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now()
    const res = await fetch(`${CF_DOWN}?bytes=0&r=${Date.now()}-${i}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    await res.arrayBuffer()
    samples.push(performance.now() - t0)
  }
  samples.sort((a, b) => a - b)
  return Math.round(samples[0])
}

async function measureDownload(): Promise<number> {
  const url = `${CF_DOWN}?bytes=${DOWNLOAD_BYTES}&r=${Date.now()}`
  const t0 = performance.now()
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' }
  })
  if (!res.ok) throw new Error(`Download test failed (HTTP ${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  const elapsed = performance.now() - t0
  if (buf.byteLength < 100_000) {
    throw new Error('Download test returned too little data')
  }
  return mbps(buf.byteLength, elapsed)
}

async function measureUpload(): Promise<number> {
  const payload = randomBytes(UPLOAD_BYTES)
  const t0 = performance.now()
  const res = await fetch(`${CF_UP}?r=${Date.now()}`, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-cache'
    }
  })
  // Cloudflare often returns 200 with empty body
  if (!res.ok) throw new Error(`Upload test failed (HTTP ${res.status})`)
  await res.arrayBuffer().catch(() => undefined)
  const elapsed = performance.now() - t0
  return mbps(UPLOAD_BYTES, elapsed)
}

/** Cloudflare speed test in the Electron main process (bypasses renderer CSP). */
export async function runSpeedTest(): Promise<SpeedTestResult> {
  const latencyMs = await measureLatency()
  const downloadMbps = await measureDownload()
  let uploadMbps = 0
  try {
    uploadMbps = await measureUpload()
  } catch {
    // Upload endpoints are occasionally blocked; still return download + latency
    uploadMbps = 0
  }
  return {
    downloadMbps,
    uploadMbps,
    latencyMs,
    server: 'Cloudflare'
  }
}
