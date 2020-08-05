export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

export default (url, c) => {
  const g = c.g
  g.loaders = g.loaders ?? {}
  g.buffers = g.buffers ?? {}

  let loader = g.loaders[url]
  if (loader) return loader

  const buffer = c.buffer.map(b => new Shared32Array(b.length))
  // buffer.THECOOLBUFFER = true

  g.loaders[url] = loader = c => {
    if (worker.state === 'terminate') return
    c.url = url
    c.buffer = buffer
    worker.postMessage({ call: worker.state, context: c.toJSON() })
    c.buffer = g.buffers[url] ?? buffer
  }
  loader.onsuccess = () => {
    console.log('loader: success')
    worker.state = 'render'
    g.buffers[url] = buffer
  }
  loader.onerror = ({ error }) => {
    console.error(error)
    console.log('loader: worker terminate')
    worker.state = 'terminate'
    worker.terminate()
    delete g.loaders[url]
  }

  const worker = new Worker(
    import.meta.url.replace('loader.js', 'worker.js'),
    { type: 'module' }
  )
  worker.state = 'setup'
  worker.onerror = error => loader.onerror({ error })
  worker.onmessage = ({ data }) => loader[data.call](data)

  return loader
}
