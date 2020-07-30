import { deserializeError } from '../lib/error.js'

let cache = null

export const setDynamicCache = (_cache) => {
  if (cache) cache.bus.close()

  cache = { ..._cache }
  cache.bus = new BroadcastChannel('dynamic-cache:' + cache.namespace)
  cache.bus.onmessage = ({ data }) => {
    recreate(data.filename)
  }
}

export const loaders = {}

const methods = {
  onsetup (worker, data) {
    const context = Object.assign(worker.loader.context, data.context)
    worker.postMessage({ call: 'render', context })
  },
  onrender (worker, data) {
    const context = Object.assign(worker.loader.context, data.context)

    const { loader } = worker
    // stop previous worker
    if (loader.worker && worker !== loader.worker) {
      loader.worker.terminate()
    }
    loader.worker = worker
    loader.render.onrender?.()
  },
  onerror (worker, data) {
    const error = deserializeError(data.error)
    worker.loader.render.onerror?.(error)
  }
}

export default (url) => {
  url = cache ? url[0] === '/' ? url : cache.path + '/' + url : url
  let loader = loaders[url]
  if (loader) return loader.render

  loader = loaders[url] = { url }
  loader.render = (context, params = {}) => {
    context.url = url
    context.params = params
    loader.context = context.toJSON?.() ?? context

    if (loader.worker) {
      queueMicrotask(() =>
        loader.worker.postMessage({ call: 'render', context: loader.context }))
    } else {
      createWorker(loader, context)
    }
  }

  return loader.render
}

const createWorker = (loader) => {
  const worker = new Worker(import.meta.url.replace('load.js', 'worker.js'), { type: 'module' })
  worker.loader = loader
  worker.onerror = (error) => methods.onerror(worker, { error })
  worker.onmessage = ({ data }) => methods[data.call](worker, data)
  worker.postMessage({ call: 'setup', context: loader.context })
}

export const recreate = (url) => {
  const loader = loaders[url]
  if (loader && loader.worker) createWorker(loader)
}
