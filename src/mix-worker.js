const isMain = typeof window !== 'undefined'
export const starting = new Map
export const workers = new Map

self.buffers = {}

export const callbacks = new Map
export const checksums = new Set

const WORKER_URL = import.meta.url.replace('.js', '-thread.js')

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
    this.worker.postMessage({ call: 'setup', url, context: (context.toJSON?.() ?? context) })
    this.postMessage({ call: 'setBuffers', buffers: self.buffers })
  }

  set onmessage (fn) {
    this.listeners.push(fn)
  }

  setBuffers ({ buffers }) {
    Object.assign(self.buffers, buffers)
  }

  postMessage (...args) {
    if (this.state === 'ready') {
      if (args[0].checksum) {
        const checksum = args[0].checksum
        if (checksums.has(checksum)) {
          // console.log('already rendered, ignore postMessage')
          callbacks.get(checksum)?.()
          return
        }
      }
      this.worker.postMessage(...args)
    } else if (this.state === 'starting') {
      this.sendQueue.push(args)
    }
  }

  proxyMessage ({ url, context, args }) {
    const worker = getWorker(url, context)
    // console.log('SENDING OUTTTTT', args[0].checksum)
    const checksum = args[0].checksum
    const callback = () => {
      this.worker.postMessage({ call: 'onrender', checksum })
    }
    callbacks.set(checksum, callback)

    worker.postMessage(...args)
  }

  onready () {
    workers.set(this.url, this)
    this.state = 'ready'
    this.sendQueue.forEach(args => this.postMessage(...args))
    this.sendQueue = []
  }

  onrender ({ checksum }) {
    // console.log('context rendered', checksum)
    checksums.add(checksum)

    const callback = callbacks.get(checksum)
    if (!callback) return console.error('no such callback:', checksum)
    callbacks.delete(checksum)
    callback()
  }

  onerror ({ error }) {
    this.state = 'failed'
    console.error(error)

    if (starting.get(this.url) === this) {
      starting.delete(this.url)
    }

    if (workers.get(this.url) === this) {
      workers.delete(this.url)
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

const mixWorker = (url, context) => {
  // console.log('CHECKSUM OUT', context.checksum)
  getWorker(url, context)
    .postMessage({
      call: 'render',
      checksum: context.checksum,
      context: context.toJSON()
    })

  return new Promise(resolve =>
    callbacks.set(context.checksum, resolve))
}

export default mixWorker

if (!isMain) {
  self.addEventListener('message', ({ data }) => {
    if (data.call === 'onrender') {
      const callback = callbacks.get(data.checksum)
      callbacks.delete(data.checksum)
      callback()
    }
  })
}