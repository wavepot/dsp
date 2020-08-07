export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

self.__buffers = self.__buffers = {}

if (typeof window !== 'undefined') {
  (async function () {
    const code = await (await fetch(import.meta.url.replace('loader.js', 'bus-worker.js'))).text()
    window.__busWorkerCode = code
    const starting = window.__starting
    const running = window.__running

    const renderBus = new BroadcastChannel('render')
    renderBus.onmessage = ({ data }) => {
    // renderBus.onmessage = (data) => {
      console.log('RECEIVE', data)
      if (data.call === 'render') {
        if (!running[data.context.url] && !starting[data.context.url]) {
          createWorker(data.context.url, data)
        }
      }
    }
    //   } else if (data.call === 'onerror') {
    //     console.error(data.error)

    //     if (starting[data.url] === data.id) {
    //       console.log('stopping starting', data.url)
    //       delete starting[data.url]
    //     }
    //     if (running[data.url] === data.id) {
    //       console.log('stopping running', data.url)
    //       delete running[data.url]
    //     }
    //   }
    // })
  }())
}

const renderBus = new BroadcastChannel('render')
renderBus.onmessage = ({ data }) => {
  console.log('RECEIVEEEEE', data)
  if (data.call === 'onrender') {
    buffers[data.context.url + data.context.id] = data.context.buffer
  }
}

let i = 0
const createWorker = async (url, data) => {
  const starting = window.__starting
  const running = window.__running
  const buffers = window.__buffers

  starting[url] = true
console.log('SHOULD START', url)
  const cache = window.__cache
  const code = window.__busWorkerCode.replaceAll('__DSP__', url)
  const filename = await cache.put('worker' + (i++), code)

  const worker = starting[url] = new Worker(filename, { type: 'module' })

  const methods = {
    onready () {
      worker.postMessage({ call: 'setBuffers', buffers: window.__buffers })
      renderBus.postMessage(data)
    },
    onrender () {
      console.log('rendered', url)
    },
    onerror ({ error }) {
      if (starting[url] === worker) {
        delete starting[url]
      }
      if (running[url] === worker) {
        delete running[url]
      }
    }
  }

  worker.onerror = error => methods.onerror({ error })
  worker.onmessage = ({ data }) => methods[data.call](data)
}

export default (url, c) => {
  const buffers = self.__buffers

  let buffer = buffers[url + c.id]
  if (!buffer) {
    buffer = c.buffer.map(buf => (new Float32Array(new SharedArrayBuffer(buf.length * Float32Array.BYTES_PER_ELEMENT))))
  }

  // const _buffer = c.buffernew SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT)
  // c.buffer = buffer
  // bus.postMessage({ call: 'render', sender: c.id, context: c.toJSON() })
  // c.buffer = _buffer
  return c => {
    // const buffer = buffers[url + c.id]
    // if (buffer) {
    c.buffer = buffer
    c.url = url
      // if (running[url]) {
        console.log('POST?!')
const renderBus = new BroadcastChannel('render')
console.dir(c.toJSON())
// delete c.buffer
    renderBus.postMessage(c.toJSON()) //{ call: 'render', context: c.toJSON() })
      // }
    // }
  }
}
  // if (url.slice(0,2) === './' && c.url) {
  //   const parts = c.url.split('/')
  //   parts.pop()
  //   parts.push(url.slice(2))
  //   url = parts.join('/')
  // }

  // const g = c.g
  // g.loaders = g.loaders ?? {}
  // g.buffers = g.buffers ?? {}

  // let loader = g.loaders[url]
  // if (loader) return loader

  // const buffer = c.buffer.map(b => new Shared32Array(b.length))
  // // buffer.THECOOLBUFFER = true

  // g.loaders[url] = loader = c => {
  //   if (worker.state === 'terminate') return
  //   c.url = url
  //   c.buffer = buffer
  //   worker.postMessage({ call: worker.state, context: c.toJSON() })
  //   c.buffer = g.buffers[url] ?? buffer
  // }
  // loader.onsuccess = () => {
  //   console.log('loader: success')
  //   worker.state = 'render'
  //   g.buffers[url] = buffer
  //   g.onload?.()
  // }
  // loader.onerror = ({ error }) => {
  //   console.error(error)
  //   console.log('loader: worker terminate')
  //   worker.state = 'terminate'
  //   worker.terminate()
  //   delete g.loaders[url]
  // }

  // const worker = new Worker(
  //   import.meta.url.replace('loader.js', 'worker.js'),
  //   { type: 'module' }
  // )
  // worker.state = 'setup'
  // worker.onerror = error => loader.onerror({ error })
  // worker.onmessage = ({ data }) => loader[data.call](data)

  // return loader
