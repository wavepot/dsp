const isMain = typeof window !== 'undefined'
export const starting = new Map
export const workers = new Map

class TopWorker {
  constructor (url) {
    this.url = url
    this.listeners = []
    this.worker = new Worker(url, { type: 'module' })
    this.worker.onerror = error => this.onerror({ error })
    this.worker.onmessage = ({ data }) => {
      this[data?.call]?.(data)
      this.listeners.forEach(fn => fn({ data }))
    }
  }

  set onmessage (fn) {
    this.listeners.push(fn)
  }

  postMessage (...args) {
    this.worker.postMessage(...args)
  }

  proxyMessage ({ url, args }) {
    const worker = getWorker(url)
    worker.postMessage(...args)
  }

  onready () {
    workers.set(this.url, this)
  }

  onerror ({ error }) {
    console.error(error)

    // if (starting.get(this.url) === this) {
    //   starting.delete(this.url)
    // }
    // if (workers.get(this.url) === this) {
    //   workers.delete(this.url)
    // }
  }
}

class WorkerProxy {
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

  if (!isMain) return new WorkerProxy(url)

  if (workers.has(url)) return workers.get(url)

  if (starting.has(url)) return starting.get(url)

  const worker = new TopWorker(url)
  starting.set(url, worker)
  return worker
}

export default getWorker
