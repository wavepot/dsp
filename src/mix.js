import Hyper from './hyper.js'
import render from './render.js'
import Context from './context.js'
import getWorker, { starting } from './mix-worker.js'
import mixBuffers from './mix-buffers.js'

export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

export default context => {
  return Hyper({
    context: new Context(context),
    execute: render,
    preprocess,
    mergeSide,
    mergeUp,
  })
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

          // const mainBuffer = c.buffer
          c.buffer = self.buffers[id]
          c.url = url
          // getWorker(url, c)
            // .postMessage({ call: 'render', context: c.toJSON() })
        }

        return c => {
          c.buffer = self.buffers[id]
          c.url = url

          if (!c.once || !starting.has(url)) {
            getWorker(url, c)
              .postMessage({ call: 'render', context: c.toJSON() })
          }
        }
      })

    return loader
  }
  return value
}

const mergeUp = (...a) => {
  let ub, db
  for (let u = a.length-1; u >= 1; u--) {
    for (let d = u-1; d >= 0; d--) {
      ub = a[u].buffer
      db = a[d].buffer
      if (ub !== db) {
        mixBuffers(db, ub)
      }
    }
  }
  return a[0]
}

const mergeSide = (...a) => {
  a = a.filter(x => typeof x !== 'string')
  for (let r = a.length-1; r >= 1; r--) {
    let l = r-1
    for (let key in a[r]) {
      // sibling iteration shouldn't copy `n`
      // i.e it should begin at the parent's
      //     position
      if (key === 'n') continue

      a[l][key] = a[r][key]
    }
  }
  return a[0]
}
