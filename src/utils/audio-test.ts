/** Play a short tone through the default speakers (Web Audio API). */
export async function playSpeakerTest(durationMs = 900, frequency = 880): Promise<void> {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    if (ctx.state === 'suspended') await ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.value = 0.0001

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)

    osc.start(now)
    osc.stop(now + durationMs / 1000 + 0.05)

    await new Promise((r) => setTimeout(r, durationMs + 80))
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

export interface MicTestResult {
  peakLevel: number
  avgLevel: number
  passed: boolean
}

/** Sample the default microphone for a few seconds and return level metrics (0–100). */
export async function runMicrophoneTest(durationMs = 2500): Promise<MicTestResult> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false
  })

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  source.connect(analyser)

  const data = new Uint8Array(analyser.fftSize)
  const samples: number[] = []
  const started = performance.now()

  await new Promise<void>((resolve) => {
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      let peak = 0
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128
        sum += v
        if (v > peak) peak = v
      }
      samples.push(peak * 100)
      if (performance.now() - started >= durationMs) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    tick()
  })

  stream.getTracks().forEach((t) => t.stop())
  await ctx.close().catch(() => undefined)

  const peakLevel = Math.round(Math.max(...samples, 0))
  const avgLevel = Math.round(samples.reduce((a, b) => a + b, 0) / Math.max(samples.length, 1))
  return {
    peakLevel,
    avgLevel,
    passed: peakLevel >= 5
  }
}
