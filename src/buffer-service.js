import install from './rpc-worker-include.js'
import Shared32Array from '../lib/shared-array-buffer.js'

const isMain = typeof window !== 'undefined'

const GC_THRESHOLD = 20 * 1000
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

const BufferService = {
  buffers,
  methods: {
    getBuffer: (checksum, size, channels = 2) => {
      const id = (checksum + size + channels).toString()
      let buffer = buffers.get(id)
      // console.log(id + ' buffer found:', !!buffer)
      // console.log([...buffers])
      // setTimeout(garbageCollect, 5*1000)
      if (buffer) {
        buffer.createdNow = false
        buffer.accessedAt = performance.now()
        return buffer
      }
      buffer = Array.from(Array(channels), () => new Shared32Array(size))
      buffer.createdNow = true
      buffer.accessedAt = performance.now()
      buffer.checksum = checksum
      buffers.set(id, buffer)
      return buffer
    },

    clear: match => garbageCollect(match)
  },
  postMessage (data) {
    BufferService.worker.onmessage({ data })
  },
  worker: {
    postMessage (data) {
      BufferService.onmessage({ data: { ackId: -999999, message: data } })
    }
  }
}

if (isMain) {
  install(BufferService)
  window['main:buffer-service'] = BufferService
  console.log('buffer service running')
}
// setInterval(garbageCollect, GC_INTERVAL)
