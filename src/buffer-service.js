import './rpc-worker-include.js'
console.log('buffer service running')
self.buffers = self.buffers ?? {}

self.methods = {
  getBuffers: () => self.buffers,
  setBuffers: buffers => Object.assign(self.buffers, buffers)
}
