import rpc from './lazy-singleton-worker-rpc.js'

const isMain = typeof window !== 'undefined'

const install = self => {
  self.rpc = rpc

  self.callbacks = self.callbacks ?? new Map

  self.onmessage = async ({ data }) => {
    try {
      if (data.message.call === 'onreply') {
        const { replyTo, error, result } = data.message
        const callback = self.callbacks.get(replyTo)
        if (callback) {
          self.callbacks.delete(replyTo)
          if (error) {
            callback.reject(error)
          } else {
            callback.resolve(result)
          }
        } else {
          console.warn('onreply discarded (receiver dead?)', replyTo, result ?? error, location.href)
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
      self.postMessage({
        ack: data.ackId,
        call: 'onreply',
        replyTo: data.message.callbackId,
        error
      })
      // self.postMessage({ call: 'onerror', error })
    }
  }

  self.onerror = (a, b, c, d, error) =>
    self.postMessage({ call: 'onerror', error })

  self.onunhandledrejection = error =>
    self.postMessage({ call: 'onerror', error: error.reason })
}

export default install

if (!isMain) {
  install(self)
}
