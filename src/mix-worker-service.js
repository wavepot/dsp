import rpc from './lazy-singleton-worker-rpc.js'

const isMain = typeof window !== 'undefined'

const THREAD_URL = new URL('mix-worker-thread.js', import.meta.url).href
const BUFFER_SERVICE_URL = new URL('buffer-service.js', import.meta.url).href

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

mixWorker.update = url => {
  rpc(BUFFER_SERVICE_URL, 'clear', [url])
  rpc.update(getRpcUrl(url))
}
mixWorker.clear = () => rpc.clearAll()

const getRpcUrl = url => {
  url = new URL(url, location.href).href
  return THREAD_URL + '?' + encodeURIComponent(url)
}
