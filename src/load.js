import { deserializeError } from '../lib/error.js'

let cache = null

export const setDynamicCache = (_cache) => {
  cache = _cache
  cache.addEventListener('update', ({ detail: filename }) => {
    recreate(filename)
  })
}

export const loaders = {}

const methods = {
  onsetup (worker, data) {
    const context = Object.assign(worker.loader.context, data.context)
    worker.postMessage({ call: 'render', context })
  },
  onrender (worker, data) {
    const context = Object.assign(worker.loader.context, data.context)

    // stop previous worker
    if (worker.loader.worker && worker !== worker.loader.worker) {
      worker.loader.worker.terminate()
    }
    worker.loader.worker = worker

    worker.loader.onrender?.()
  },
  onerror (worker, data) {
    const error = deserializeError(data.error)
    worker.loader.onerror?.(error)
  }
}

export default (url) => {
  let loader = loaders[url]
  if (loader) return loader

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

  return loader
}

const createWorker = (loader) => {
  const worker = new Worker('/src/worker.js', { type: 'module' })
  worker.loader = loader
  worker.onerror = (error) => methods.onerror(worker, { error })
  worker.onmessage = ({ data }) => methods[data.call](worker, data)
  worker.postMessage({ call: 'setup', context: loader.context })
}

export const recreate = (url) => {
  const loader = loaders[url]
  if (loader) createWorker(loader)
}
