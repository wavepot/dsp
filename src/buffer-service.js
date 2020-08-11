import './rpc-worker-include.js'
import Shared32Array from '../lib/shared-array-buffer.js'

console.log('buffer service running')

const GC_THRESHOLD = 2 * 1000
const GC_INTERVAL = 2 * 1000

const buffers = new Map

const garbageCollect = match => {
  const now = performance.now()
  for (const [key, buffer] of buffers.entries()) {
    if ((match && key.includes(match))
    || (now - buffer.accessedAt > GC_THRESHOLD)) {
      buffers.delete(key)
      // console.log('buffer service gc:', key)
    }
  }
  return true
}

self.methods = {
  getBuffer: (checksum, size, channels = 2) => {
    const id = checksum + size + channels
    let buffer = buffers.get(id)
    if (buffer) {
      buffer.accessedAt = performance.now()
      return buffer
    }
    buffer = {
      accessedAt: performance.now(),
      checksum,
      buffer: Array.from(Array(channels), () => new Shared32Array(size))
    }
    buffers.set(id, buffer)
    return buffer
  },

  clear: match => garbageCollect(match)
}

setInterval(garbageCollect, GC_INTERVAL)
