/**
 * DormantRing — Ring Buffer for Hidden Terminal PTY Output
 *
 * When a terminal tab is not visible (background tab), PTY output still
 * arrives. Instead of dropping it, buffer it here and flush when the
 * terminal becomes visible again (via a fresh xterm instance).
 *
 * Cap: 256KB total bytes, 256 individual chunks. Oldest chunks are dropped
 * first on overflow, and an overflow notice is prepended on drain.
 */

export const DORMANT_RING_BYTE_CAP = 256 * 1024 // 256KB
export const DORMANT_RING_CHUNK_CAP = 256

const OVERFLOW_NOTICE = '\r\n\x1b[33m[output truncated — buffer overflow]\x1b[0m\r\n'

export class DormantRing {
  private chunks: Uint8Array[] = []
  private totalBytes = 0
  private overflowed = false

  push(data: Uint8Array): void {
    if (!data || data.length === 0) return

    this.chunks.push(data)
    this.totalBytes += data.length

    while (this.chunks.length > DORMANT_RING_CHUNK_CAP) {
      const oldest = this.chunks.shift()!
      this.totalBytes -= oldest.length
      this.overflowed = true
    }

    while (this.totalBytes > DORMANT_RING_BYTE_CAP) {
      const oldest = this.chunks.shift()!
      this.totalBytes -= oldest.length
      this.overflowed = true
    }
  }

  drain(): Uint8Array | null {
    if (this.chunks.length === 0 && !this.overflowed) {
      this.clear()
      return null
    }

    const parts: Uint8Array[] = []

    if (this.overflowed) {
      parts.push(new TextEncoder().encode(OVERFLOW_NOTICE))
    }

    if (this.chunks.length === 1) {
      parts.push(this.chunks[0])
    } else if (this.chunks.length > 1) {
      const merged = new Uint8Array(this.totalBytes)
      let offset = 0
      for (const chunk of this.chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      parts.push(merged)
    }

    this.clear()

    if (parts.length === 1) return parts[0]
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0)
    const result = new Uint8Array(totalLen)
    let offset = 0
    for (const part of parts) {
      result.set(part, offset)
      offset += part.length
    }
    return result
  }

  get byteCount(): number {
    return this.totalBytes
  }

  get hasOverflowed(): boolean {
    return this.overflowed
  }

  clear(): void {
    this.chunks = []
    this.totalBytes = 0
    this.overflowed = false
  }
}

export class SessionDormantRing {
  private rings = new Map<string, DormantRing>()

  push(tabId: string, data: Uint8Array): void {
    let ring = this.rings.get(tabId)
    if (!ring) {
      ring = new DormantRing()
      this.rings.set(tabId, ring)
    }
    ring.push(data)
  }

  drain(tabId: string): Uint8Array | null {
    const ring = this.rings.get(tabId)
    if (!ring) return null
    const result = ring.drain()
    this.rings.delete(tabId)
    return result
  }

  clearSession(tabId: string): void {
    this.rings.delete(tabId)
  }

  clearAll(): void {
    this.rings.clear()
  }
}
