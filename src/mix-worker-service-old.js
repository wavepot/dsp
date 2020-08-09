const isMain = typeof window !== 'undefined'
export const starting = new Map
export const workers = new Map

self.buffers = {}

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
      context: context?.toJSON?.() ?? context
    })
    this.worker.postMessage({ call: 'setBuffers', buffers: self.buffers })
  }

  set onmessage (fn) {
    this.listeners.push(fn)
  }

  setBuffers ({ buffers }) {
    Object.assign(self.buffers, buffers)
  }

  postMessage (...args) {
    if (this.state === 'ready') {
      this.worker.postMessage(...args)
    } else if (this.state === 'starting') {
      this.sendQueue.push(args)
    }
  }

  proxyMessage ({ url, context, args }) {
    const worker = getWorker(url, context)
    const callback = (data) => {
      this.worker.postMessage(data)
      // {
        // call: 'onrender',
        // callbackId: args[0].callbackId
      // })
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
    if (!callbacks.has(data.callbackId)) {
      if (data.callbackId && data.callbackId.slice(0,4) !== 'test') {
        console.error('no such callback:', data.callbackId, this.url)
      }
      return
    }
    const { callback } = callbacks.get(data.callbackId)
    callback({ call: 'onresponse', data })
  }

  onerror (data) {
    this.state = 'failed'
    console.error(data.error)

    if (starting.get(this.url) === this) {
      starting.delete(this.url)
    }

    let oldWorker = workers.get(this.url)
    if (oldWorker && oldWorker !== this && oldWorker.state === 'ready') {
      starting.set(this.url, oldWorker)
    } else {
      oldWorker = null
    }

    for (const [id, { callback, context }] of callbacks.entries()) {
      if (id.includes(this.url)) {
        callback.retries = callback.retries || 0
        callback.retries++
        if (oldWorker && callback.retries < 5) {
          console.log('found old worker', oldWorker)
          console.log(context)
          oldWorker.postMessage({ call: 'render', callbackId: id, context })
        } else {
          callback({ call: 'onerror', error: data.error })
          callbacks.delete(id)
        }
      }
    }

    if (oldWorker && this.sendQueue.length > 0) {
      this.sendQueue.forEach(args => oldWorker.postMessage(...args))
      this.sendQueue = []
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

  const promise = new Promise((resolve, reject) => {
    const callback = (data) => {
      callbacks.delete(cid)
      if (data.call === 'onerror') {
        reject(data.error)
      } else {
        resolve(data.data) //{ call: 'onresponse', data })
      }
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
    if (data && data.call === 'onresponse') {
      const { callback } = callbacks.get(data.data.callbackId)
      callback(data.data)
    }
  })

  // onmessage = ({ data }) => worker[data.call](data)

  // self.onerror = (a, b, c, d, error) =>
  //   postMessage({ call: 'onerror', error })

  // self.onunhandledrejection = error =>
  //   postMessage({ call: 'onerror', error: error.reason })
}
