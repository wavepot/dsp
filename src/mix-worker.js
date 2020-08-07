const isMain = typeof window !== 'undefined'
export const starting = new Map
export const workers = new Map

self.buffers = {}

const WORKER_URL = import.meta.url.replace('.js', '-thread.js')

class MixWorker {
  constructor (url) {
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
    this.worker.postMessage({ call: 'setup', url })
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
      this.worker.postMessage(...args)
    } else if (this.state === 'starting') {
      this.sendQueue.push(args)
    }
  }

  proxyMessage ({ url, args }) {
    const worker = getWorker(url)
    worker.postMessage(...args)
  }

  onready () {
    workers.set(this.url, this)
    this.state = 'ready'
    this.sendQueue.forEach(args => this.postMessage(...args))
    this.sendQueue = []
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
  constructor (url) {
    this.url = url
  }

  postMessage (...args) {
    self.postMessage({
      call: 'proxyMessage',
      url: this.url,
      args
    })
  }
}

const getWorker = url => {
  if (url[0] === '/') url = location.origin + url

  if (!isMain) return new MixWorkerProxy(url)

  if (starting.has(url)) return starting.get(url)

  const worker = new MixWorker(url)
  starting.set(url, worker)

  if (workers.has(url)) return workers.get(url)

  return worker
}

export default getWorker
