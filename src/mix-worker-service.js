import './buffer-service.js'
import rpc from './lazy-singleton-worker-rpc.js'

const isMain = typeof window !== 'undefined'

const THREAD_URL = new URL('mix-worker-thread.js', import.meta.url).href
const BUFFER_SERVICE_URL = 'main:buffer-service'

const mixWorker = (url, context) => {
  const rpcUrl = getRpcUrl(url)
  return Promise.race([
    new Promise((resolve, reject) => setTimeout(reject, 30000, new Error('mixWorker: Timed out'))),
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
const skipCreate = new Set

mixWorker.update = (url, force = false, noCreate = false) => {
  if (noCreate) {
    skipCreate.add(url)
  }
  if (!force && mixWorker.queueUpdates) {
    scheduleUpdate.add(url)
  } else {
    rpc.update(getRpcUrl(url), noCreate)
  }
}

mixWorker.flushUpdates = () => {
  for (const url of scheduleUpdate) {
    mixWorker.update(url, true, skipCreate.has(url))
  }
  scheduleUpdate.clear()
  skipCreate.clear()
}

mixWorker.clear = () => rpc.clearAll()

const getRpcUrl = url => {
  url = new URL(url, location.href).href
  return THREAD_URL + '?' + encodeURIComponent(url)
}
