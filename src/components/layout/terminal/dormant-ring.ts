/**
 * DormantRing — Ring Buffer for Hidden Terminal PTY Output
 *
 * When a terminal tab is not visible (background tab), PTY output still
 * arrives. Instead of dropping it, buffer it here and flush when the
 * terminal becomes visible again (via a fresh xterm instance).
 *
 * Cap: 256KB total bytes, 256 individual chunks. Oldest chunks are dropped
 * first on overflow, and an overflow notice is prepended on drain.
 *
 * Performance: Uses a head-pointer to avoid O(n²) Array.shift() on overflow.
 */

export const DORMANT_RING_BYTE_CAP = 256 * 1024 // 256KB
export const DORMANT_RING_CHUNK_CAP = 256
/** Auto-compact the underlying array when > this fraction is garbage. */
const COMPACT_THRESHOLD = 0.5

const OVERFLOW_NOTICE = '\r\n\x1b[33m[output truncated — buffer overflow]\x1b[0m\r\n'

export class DormantRing {
  private chunks: Uint8Array[] = []
  private head = 0
  private totalBytes = 0
  private overflowed = false

  push(data: Uint8Array): void {
    if (!data || data.length === 0) return

    this.chunks.push(data)
    this.totalBytes += data.length

    // Drop oldest chunks until within chunk cap
    while ((this.chunks.length - this.head) > DORMANT_RING_CHUNK_CAP) {
      this.totalBytes -= this.chunks[this.head].length
      this.head++
      this.overflowed = true
    }

    // Drop oldest chunks until within byte cap
    while (this.totalBytes > DORMANT_RING_BYTE_CAP && this.head < this.chunks.length) {
      this.totalBytes -= this.chunks[this.head].length
      this.head++
      this.overflowed = true
    }

    this.compactIfNeeded()
  }

  drain(): Uint8Array | null {
    const count = this.chunks.length - this.head
    if (count === 0 && !this.overflowed) {
      this.clear()
      return null
    }

    const overflowNotice = this.overflowed
      ? new TextEncoder().encode(OVERFLOW_NOTICE)
      : null

    this.overflowed = false

    // Single chunk: return directly, no copy needed
    if (count === 1 && !overflowNotice) {
      const result = this.chunks[this.head]
      this.clear()
      return result
    }

    if (count === 1 && overflowNotice) {
      const chunk = this.chunks[this.head]
      const result = new Uint8Array(overflowNotice.length + chunk.length)
      result.set(overflowNotice, 0)
      result.set(chunk, overflowNotice.length)
      this.clear()
      return result
    }

    // Multiple chunks: merge into single Uint8Array
    const bodyLen = count > 0 ? this.totalBytes : 0
    const totalLen = (overflowNotice ? overflowNotice.length : 0) + bodyLen
    if (totalLen === 0) {
      this.clear()
      return null
    }

    const result = new Uint8Array(totalLen)
    let offset = 0

    if (overflowNotice) {
      result.set(overflowNotice, 0)
      offset = overflowNotice.length
    }

    for (let i = this.head; i < this.chunks.length; i++) {
      result.set(this.chunks[i], offset)
      offset += this.chunks[i].length
    }

    this.clear()
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
    this.head = 0
    this.totalBytes = 0
    this.overflowed = false
  }

  /** Compacts the backing array when too much of it is garbage (head > 50%). */
  private compactIfNeeded(): void {
    if (this.head === 0) return
    if (this.head / this.chunks.length >= COMPACT_THRESHOLD) {
      this.chunks = this.chunks.slice(this.head)
      this.head = 0
    }
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
