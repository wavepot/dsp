const isMain = typeof window !== 'undefined'
export const starting = new Map
export const workers = new Map

// self.buffers = {}

export const callbacks = new Map

const WORKER_URL = import.meta.url.replace('service', 'thread')

class MixWorker {
  constructor (url, context) {
    this.url = url
    this.state = 'starting'
    this.listeners = []
    this.sendQueue = []
    this.worker = new Worker(WORKER_URL, { type: 'module' })
    this.worker.onerror = error => this.onerror({ error })
    this.worker.onmessage = ({ data }) => {
      this[data?.call]?.(data)
      this.listeners.forEach(fn => fn({ data }))
    }
    this.worker.postMessage({
      call: 'setup',
      url,
      context: (context.toJSON?.() ?? context)
    })
    // this.postMessage({ call: 'setBuffers', buffers: self.buffers })
  }

  set onmessage (fn) {
    this.listeners.push(fn)
  }

  setBuffers ({ buffers }) {
    Object.assign(self.buffers, buffers)
  }

  postMessage (...args) {
    if (this.state === 'ready') {
      // if (args[0].checksum) {
      //   const checksum = args[0].checksum
      //   if (checksums.has(checksum)) {
      //     // console.log('already rendered, ignore postMessage')
      //     callbacks.get(checksum)?.()
      //     return
      //   }
      // }
      this.worker.postMessage(...args)
    } else if (this.state === 'starting') {
      this.sendQueue.push(args)
    }
  }

  proxyMessage ({ url, context, args }) {
    const worker = getWorker(url, context)
    // console.log('SENDING OUTTTTT', args[0].checksum)
    // console.log('proxying message id', args[0].callbackId)
    const callback = () => {
      // console.log('callback called in proxy', args[0].callbackId, url)
      this.worker.postMessage({
        call: 'onrender',
        callbackId: args[0].callbackId
      })
      callbacks.delete(args[0].callbackId)
    }
    callbacks.set(args[0].callbackId, {
      callback,
      context: args[0].context
    })

    worker.postMessage(...args)
  }

  onready () {
    workers.set(this.url, this)
    this.state = 'ready'
    this.sendQueue.forEach(args => this.postMessage(...args))
    this.sendQueue = []
  }

  onrender (data) {
    // console.log('context rendered', checksum)
    // checksums.add(checksum)

    if (!callbacks.has(data.callbackId)) {
      if (data.callbackId) {
        console.error('no such callback:', data.callbackId, this.url)
      }
      return
    }
    const { callback } = callbacks.get(data.callbackId)
    // callbacks.delete(checksum)
    callback()
  }

  onerror ({ error }) {
    this.state = 'failed'
    console.error(error)

    if (starting.get(this.url) === this) {
      starting.delete(this.url)
    }

    let oldWorker = workers.get(this.url)
    if (oldWorker) {
      starting.set(this.url, oldWorker)
    }

    for (const [id, { callback, context }] of callbacks.entries()) {
      if (id.includes(this.url)) {
        // TODO: retry
        callback.retries = callback.retries || 0
        callback.retries++
        if (oldWorker && callback.retries < 2) {
          console.log('found old worker', oldWorker)
          console.log(context)
          oldWorker.postMessage({ call: 'render', callbackId: id, context })
        } else {
          callback()
          callbacks.delete(id)
        }
      }
    }
  }
}

class MixWorkerProxy {
  constructor (url, context) {
    this.url = url
    this.context = context
  }

  postMessage (...args) {
    self.postMessage({
      call: 'proxyMessage',
      url: this.url,
      context: (this.context.toJSON?.() ?? this.context),
      args
    })
  }
}

const getWorker = (url, context) => {
  if (url[0] === '/') url = location.origin + url

  if (!isMain) return new MixWorkerProxy(url, context)

  if (starting.has(url)) return starting.get(url)

  const worker = new MixWorker(url, context)
  starting.set(url, worker)

  // if (workers.has(url)) return workers.get(url)

  return worker
}

let callbackId = 0

const mixWorker = (url, context) => {
  const cid = context.id + url + (++callbackId)

  const promise = new Promise(resolve => {
    const callback = () => {
      // console.log('callback called', cid, url)
      callbacks.delete(cid)
      resolve()
    }
    callbacks.set(cid, {
      callback,
      context: context.toJSON()
    })
  })

  getWorker(url, context)
    .postMessage({
      call: 'render',
      callbackId: cid,
      context: context.toJSON()
    })

  return promise
}

export default mixWorker

if (!isMain) {
  self.addEventListener('message', ({ data }) => {
    if (data.call === 'onrender') {
      const { callback } = callbacks.get(data.callbackId)
      callback()
    }
  })
}
