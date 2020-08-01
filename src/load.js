import { deserializeError } from '../lib/error.js'

let cache = null

export const setDynamicCache = (_cache) => {
  if (cache) cache.bus.close()

  cache = { ..._cache }
  cache.bus = new BroadcastChannel('dynamic-cache:' + cache.namespace)
  cache.bus.onmessage = ({ data }) => {
    if (data.type === 'change') {
      methods.onchange(data.filename)
    } else if (data.type === 'update') {
      methods.onupdate(data.filename)
    }
  }
}

export const loaders = {}

const methods = {
  onchange (url) {
    const loader = loaders[url]
    if (loader && loader.worker) {
      if (loader.context.mode !== 'oneshot') {
        // loader.scheduleRender = false
        // loader.context.n -= loader.context.bufferSize
      }
      methods.createWorker(loader)
      // loader.worker.postMessage({
      //   call: 'setup',
      //   context: { ...loader.context, n: loader.context.n - loader.context.bufferSize },
      //   isChange: true
      // })
      loader.render.onchange?.()
    }
  },
  onupdate (url) {
    const loader = loaders[url]
    if (loader) {
      loader.render.onupdate?.()
      // loader.worker.postMessage({ call: 'render', context: loader.context })
    }
  },
  onsetup (worker, data) {
    // console.log('onsetup', data)
    const context = Object.assign(worker.loader.contextRef, data.context)
    worker.loader.context = context.toJSON?.() ?? context
    worker.postMessage({ call: 'render', context: worker.loader.context })
  },
  onrender (worker, data) {
    console.log('onrender', data.context)
    const context = Object.assign(worker.loader.contextRef, data.context)

    const { loader } = worker
    loader.scheduleRender = false
    loader.context = context.toJSON?.() ?? context

    // stop previous worker
    if (loader.worker && worker !== loader.worker) {
      loader.worker.terminate()
    }
    loader.worker = worker
    loader.render.onrender?.()
  },
  onerror (worker, data) {
    const error = deserializeError(data.error)
    if (worker.loader.render.onerror) {
      worker.loader.render.onerror(error)
    } else {
      console.error(error)
      // throw error
    }
  },
  createWorker (loader) {
    const worker = new Worker(import.meta.url.replace('load.js', 'worker.js'), { type: 'module' })
    // loader.worker = worker
    worker.loader = loader
    worker.onerror = (error) => methods.onerror(worker, { error })
    worker.onmessage = ({ data }) => methods[data.call](worker, data)
    worker.postMessage({ call: 'setup', context: loader.context })
  }
}

export default (url, _context = {}) => {
  url = cache ? url[0] === '/' ? url : cache.path + '/' + url : url
  if (_context.cache) setDynamicCache(_context.cache)
  let loader = loaders[url]
  if (loader) return loader.render

  loader = loaders[url] = { url }
  loader.render = (context, params = {}) => {
    if (loader.scheduleRender) return
    loader.scheduleRender = true

    if (context.cache) setDynamicCache(context.cache)
    context.url = url
    context.params = params
    loader.contextRef = context
    loader.context = {
      ...(_context.toJSON?.() ?? _context),
      ...(context.toJSON?.() ?? context),
    }

    if (loader.context.autoRender) {
      loader.render.onupdate = () => loader.render(context)
    }

    if (loader.worker) {
      queueMicrotask(() =>
        loader.worker.postMessage({ call: 'render', context: loader.context }))
    } else {
      methods.createWorker(loader)
    }
  }

  return loader.render
}
