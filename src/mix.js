import Hyper from './hyper.js'
import render from './render.js'
import Context from './context.js'
import getWorker from './mix-worker.js'
import mixBuffers from './mix-buffers.js'

export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

export default context => {
  return Hyper(
    new Context(context),
    render,
    merge,
    preprocess
  )
}

const merge = (...args) => {
  args = args.filter(arg => typeof arg !== 'string')
  for (let i = args.length - 1; i >= 1; i--) {
    for (let j = i-1; j >= 0; j--) {
      Object.assign(args[j], args[i])
    }
  }
  return args[0]
}

const loaders = {}

const preprocess = context => value => {
  if (typeof value === 'string') {
    let url = value
    if (url.slice(0,2) === './' && context.url) {
      const parts = context.url.split('/')
      parts.pop()
      parts.push(url.slice(2))
      url = parts.join('/')
    } else if (url[0] === '/') {
      url = location.origin + url
    }

    const id = url + context.id
    const loader =
    loaders[id] =
    loaders[id] ??
      (async c => {
        if (!self.buffers[id]) {
          const sharedBuffer = c.buffer.map(buffer =>
            new Shared32Array(buffer.length))

          self.buffers[id] = sharedBuffer
          if (typeof window === 'undefined') {
            postMessage({ call: 'setBuffers', buffers: self.buffers })
          }

          const mainBuffer = c.buffer
          c.buffer = self.buffers[id]
          getWorker(url)
            .postMessage({ call: 'render', context: c.toJSON() })
          c.buffer = mainBuffer
        }

        return c => {
          const mainBuffer = c.buffer
          c.buffer = self.buffers[id]

          if (!c.once) {
            getWorker(url)
              .postMessage({ call: 'render', context: c.toJSON() })
          }

          c.buffer = mixBuffers(mainBuffer, c.buffer)
        }
      })

    return loader
  }
  return value
}
