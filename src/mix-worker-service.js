import rpc from './lazy-singleton-worker-rpc.js'

const isMain = typeof window !== 'undefined'

const THREAD_URL = new URL('mix-worker-thread.js', import.meta.url).href

const mixWorker = (url, context) => {
  const rpcUrl = getRpcUrl(url)
  return Promise.race([
    new Promise(resolve => setTimeout(resolve, 2000, new Error('Timed out'))),
    rpc(rpcUrl, 'render', [url, context.toJSON?.() ?? context]).then(result => {
      if (isMain) rpc.markAsSafe(rpcUrl)
      return result
    })
  ])
}

export default mixWorker

mixWorker.update = url => rpc.update(getRpcUrl(url))
mixWorker.clear = () => rpc.clearAll()

const getRpcUrl = url => {
  url = new URL(url, location.href).href
  return THREAD_URL + '?' + encodeURIComponent(url)
}
