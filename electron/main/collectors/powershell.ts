import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ============================================================
// PowerShell result cache — prevents spawning PS every poll
// ============================================================
interface CacheEntry {
  value: string
  expiresAt: number
}
const psCache = new Map<string, CacheEntry>()

/**
 * Execute a PowerShell script and return stdout.
 * Results are cached by script content for `ttlMs` milliseconds.
 * Default TTL: 15 seconds — avoids spawning PS on every poll.
 */
export async function execPowerShell(script: string, ttlMs = 15000): Promise<string> {
  const now = Date.now()
  const cached = psCache.get(script)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  try {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { stdout } = await execAsync(
      `powershell.exe -NonInteractive -NoProfile -EncodedCommand ${encoded}`,
      { timeout: 15000 }
    )
    const result = stdout.trim()
    psCache.set(script, { value: result, expiresAt: now + ttlMs })
    return result
  } catch {
    // Return empty string on failure — callers must handle gracefully
    return ''
  }
}

/** Clear the PS cache (useful when forcing a fresh read) */
export function clearPsCache(): void {
  psCache.clear()
}
