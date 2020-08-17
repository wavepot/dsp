import './buffer-service.js'
import rpc from './lazy-singleton-worker-rpc.js'

const isMain = typeof window !== 'undefined'

const THREAD_URL = new URL('mix-worker-thread.js', import.meta.url).href
const BUFFER_SERVICE_URL = 'main:buffer-service' //new URL('buffer-service.js', import.meta.url).href

const mixWorker = (url, context) => {
  const rpcUrl = getRpcUrl(url)
  return Promise.race([
    new Promise((resolve, reject) => setTimeout(reject, 5000, new Error('mixWorker: Timed out'))),
    rpc(rpcUrl, 'render', [url, context.toJSON?.() ?? context]).then(result => {
      if (isMain) rpc.markAsSafe(rpcUrl)
      return result
    })
  ])
}

export default mixWorker

rpc.onfail = rpc.onerror = (error, url) => mixWorker.onerror?.(error, url)

mixWorker.queueUpdates = false

const scheduleUpdate = mixWorker.scheduleUpdate = new Set

mixWorker.update = (url, force = false) => {
  if (!force && mixWorker.queueUpdates) {
    scheduleUpdate.add(url)
  } else {
    // rpc(BUFFER_SERVICE_URL, 'clear', [url])
    rpc.update(getRpcUrl(url))
  }
}

mixWorker.flushUpdates = () => {
  for (const url of scheduleUpdate) {
    mixWorker.update(url, true)
  }
  scheduleUpdate.clear()
}

mixWorker.clear = () => rpc.clearAll()

const getRpcUrl = url => {
  url = new URL(url, location.href).href
  return THREAD_URL + '?' + encodeURIComponent(url)
}
