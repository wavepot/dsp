import mixBuffers from './mix-buffers.js'
import Mix from './mix.js'

export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

const isMain = typeof window !== 'undefined'
const buffers = self.__urlBuffers = self.__urlBuffers ?? {}
const starting = self.__urlStarting = self.__urlStarting ?? {}
const running = self.__urlRunning = self.__urlRunning ?? {}
const loaders = self.__urlLoaders = self.__urlLoaders ?? {}

if (isMain) {
  ;(async function () {
    const code = await (await fetch(import.meta.url.replace('loader.js', 'bus-worker.js'))).text()
    window.__busWorkerCode = code
  }())
}

let i = 0

const Loader = (url, c) => {
  if (url.slice(0,2) === './' && c.url) {
    const parts = c.url.split('/')
    parts.pop()
    parts.push(url.slice(2))
    url = parts.join('/')
  }

  console.log(loaders, loaders[url])
  if (loaders[url]) return loaders[url]

  const loader = loaders[url] = async c => {
    const urlId = url + c.id
    console.log('SETUP LOADER', urlId)

    const sharedBuffer = buffers[urlId] = buffers[urlId]
      ?? c.buffer.map(buffer => new Shared32Array(buffer.length))

    if (isMain) {
      if (!starting[url]) {
        console.log('STARTING', url)
        const cache = window.__cache
        const code = window.__busWorkerCode
          .replace('__DSP__', url)
          .replace('__MIX_PATH__', import.meta.url.replace('loader.js', 'mix.js'))
        const filename = await cache.put('worker' + (i++), code)
        const worker = starting[url] = new Worker(filename, { type: 'module' })

        const methods = {
          onready () {
            worker.postMessage({ call: 'setBuffers', buffers: buffers })

            const mainBuffer = c.buffer
            c.buffer = sharedBuffer
            c.url = url
            worker.postMessage({ call: 'render', context: c.toJSON() })
            c.buffer = mainBuffer
            // c.buffer = mixBuffers(mainBuffer, sharedBuffer)

          },
          onrender () {
            running[url] = worker
            // delete starting[url]
            console.log('rendered', url)
          },
          onerror ({ error }) {
            if (starting[url] === worker) {
              delete starting[url]
            }
            if (running[url] === worker) {
              delete running[url]
            }
          },
          async render ({ url, context }) {
            const mix = Mix(context)
            await mix(url)
            // const fn = await (Loader(url, context)(context))
            // fn(context)
          }
        }

        worker.onerror = error => methods.onerror({ error })
        worker.onmessage = ({ data }) => methods[data.call](data)
      }
    }

    if (isMain) {
      return c => {
        const mainBuffer = c.buffer
        c.buffer = mixBuffers(mainBuffer, sharedBuffer)
        // sharedBuffer.forEach(buf => buf.fill(0))
        c.buffer = sharedBuffer
        c.url = url
        running[url]?.postMessage({ call: 'render', context: c.toJSON() })
        c.buffer = mainBuffer
      }
    } else {
      return c => {
        const mainBuffer = c.buffer
        c.buffer = mixBuffers(mainBuffer, sharedBuffer)
        // sharedBuffer.forEach(buf => buf.fill(0))
        c.buffer = sharedBuffer
        c.url = url
        self.postMessage({ call: 'render', url, context: c.toJSON() })
        c.buffer = mainBuffer
      }
    }
  }

  return loader
}

export default Loader
