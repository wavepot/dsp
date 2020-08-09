import rpc from './lazy-singleton-worker-rpc.js'

self.rpc = rpc

self.callbacks = self.callbacks ?? new Map

self.onmessage = async ({ data }) => {
  try {
    if (data.message.call === 'onreply') {
      const { replyTo, result } = data.message
      const callback = self.callbacks.get(replyTo)
      if (callback) {
        self.callbacks.delete(replyTo)
        callback(result)
      } else {
        console.warn('onreply discarded (receiver dead?)', replyTo, result, location.href)
      }
      self.postMessage({ ack: data.ackId })
      return
    }
    if (!(data.message.call in self.methods)) {
      throw new ReferenceError(
        'rpc: Method not found: ' + data.message.call)
    }
    const result = await self.methods[data.message.call](...data.message.args)
    self.postMessage({
      ack: data.ackId,
      call: 'onreply',
      replyTo: data.message.callbackId,
      result
    })
  } catch (error) {
    self.postMessage({ call: 'onerror', error })
  }
}

self.onerror = (a, b, c, d, error) =>
  self.postMessage({ call: 'onerror', error })

self.onunhandledrejection = error =>
  self.postMessage({ call: 'onerror', error: error.reason })
