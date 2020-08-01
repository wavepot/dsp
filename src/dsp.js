import toFinite from '../lib/to-finite.js'
import RingBuffer from '../lib/ring-buffer.js'
import render from './render.js'
import load, { setDynamicCache } from './load.js'
export { setDynamicCache }

const fnMap = new Map

export const mix = (...fns) => async (data, params) => {
  let context = {}

  const _buffer = data.buffer
  data.buffer = _buffer.map(buf => new Shared32Array(buf.length))

  for (const fn of fns) {
    context = Context(data).merge(context).merge({
      n: data.mode === 'loop'
    ? data.n || 0
    : 0
    })
    if (!fnMap.has(fn)) {
      if (fn.constructor.name === 'AsyncFunction') {
        fnMap.set(fn, await fn(context, params))
      } else {
        fnMap.set(fn, fn)
      }
    }
    await render(fnMap.get(fn), context, params)
  }

  Object.assign(data, context)

  data.buffer.forEach((buf, i) => _buffer[i].set(buf))
  data.buffer = _buffer
}

export const workerMix = (url, context) => load(url, context)

export class Shared32Array extends Float32Array {
  constructor (size) {
    super(new SharedArrayBuffer(size * Float32Array.BYTES_PER_ELEMENT))
  }
}

const proto = {
  valueOf: {
    value () { return this[this.ig] }
  },
  ig: {
    value: 's',
    enumerable: true,
    writable: true
  },
  n: {
    value: 0,
    enumerable: true,
    writable: true
  },
  k: {
    enumerable: false,
    get () { return (1 + this.n) / this.beatRate }
  },
  k1: {
    enumerable: false,
    get () { return this.k % 1 }
  },
  s: {
    enumerable: false,
    get () { return (1 + this.n) / this.sampleRate }
  },
  p: {
    enumerable: false,
    get () { return this.n % this.bufferSize }
  },
  x: {
    enumerable: false,
    get () { return this.input }
  },
  buffer: {
    value: null,
    enumerable: true,
    writable: true
  },
  sampleRate: {
    value: 44100,
    enumerable: true,
    writable: true
  },
  bpm: {
    value: 60,
    enumerable: true,
    writable: true
  },
  beatRate: {
    value: 44100,
    enumerable: true,
    writable: true
  },
  bufferSize: {
    value: 44100,
    enumerable: true,
    writable: true
  },
  mix: {
    value: mix
  },
  render: {
    value (url, context = {}) {
      const render = this.workerMix(url)
      if (!context.buffer) {
        if (render.buffer) {
          context.buffer = render.buffer
        } else {
          context.buffer
          = render.buffer
          = this.buffer.map((buf, i) =>
            new Shared32Array(buf.length))
        }
      }
      render(context)
      const sampler = (t, { size = context.buffer[0].length } = {}) => {
        const value = [
          context.buffer[0][t.n % size],
          context.buffer?.[1][t.n % size] ?? 0
        ]
        value.valueOf = () => (value[0] + value[1]) / context.buffer.length
        return value
      }
      sampler.buffer = context.buffer
      return sampler
    }
  },
  workerMix: {
    value (url) {
      let render

      if (url[0] === '/') {
        render = workerMix(url, this)
      } else {
        const path = this.url.split('/').slice(0, -1)
        path.push(url)
        render = workerMix(path.join('/'), this)
      }

      render.onerror = (error) => {
        console.error(error)
      }

      render.onrender = () => {
        const bus = new BroadcastChannel('dynamic-cache:' + this.cache.namespace)
        bus.postMessage({ type: 'update', filename: this.url })
      }

      return render
    }
  },
  Buffer: {
    value: Shared32Array
  },
  RingBuffer: {
    value (name, size) {
      this.rings ??= {}
      if (!this.rings[name] || this.rings[name].length !== size) {
        this.rings[name] = new Shared32Array(size)
      }
      return new RingBuffer(this.rings[name])
    }
  },
  rc: {
    value (hz = 250) {
      return 1.0 / (hz * 2 * Math.PI)
    }
  },
  dt: {
    enumerable: false,
    get () {
      return 1.0 / this.sampleRate
    }
  },
  lowcut: {
    value (hz = 250) {
      const rc = this.rc(hz)
      const dt = this.dt
      return dt / (rc + dt)
    }
  },
  highcut: {
    value (hz = 250) {
      const rc = this.rc(hz)
      const dt = this.dt
      return rc / (rc + dt)
    }
  },
  clip: {
    value (amt = .5) {
      return this.input / (amt + Math.abs(this.input))
    }
  },
  input: {
    enumerable: false,
    get () {
      this._input.pos = this.p
      return this._input
    },
    set () {
      throw new TypeError('input is not writable')
    }
  },
  merge: {
    value (data) {
      return Object.assign(this, data)
    }
  },
  toJSON: {
    value () {
      const obj = {}
      for (const key in this) {
        obj[key] = this[key]
      }
      return obj
    }
  }
}

export const Context = (data, params = {}) => {
  let context = data

  const mix = async (...fns) => {
    for (const fn of fns) {
      context = Context(data).merge(context).merge({
        n: data.mode === 'loop'
      ? data.n || 0
      : 0
      })
      if (!fnMap.has(fn)) {
        if (fn.constructor.name === 'AsyncFunction') {
          fnMap.set(fn, await fn(context, params))
        } else {
          fnMap.set(fn, fn)
        }
      }
      await render(fnMap.get(fn), context, params)
    }
    Object.assign(mix, context)
  }

  Object.defineProperties(mix, proto)

  Object.defineProperty(mix, '_input', {
    value: {
      pos: 0,
      valueOf () {
        return this[0] + (this[1] ?? 0)
      }
    }
  })

  for (const [i, buffer] of data.buffer.entries()) {
    Object.defineProperty(mix._input, i, {
      configurable: true,
      get () { return buffer[mix._input.pos] },
      set () { throw new TypeError('input not writable') }
    })
  }

  mix.merge(data)

  data.bufferSize = mix.bufferSize = mix.buffer[0].length
  data.bpm = mix.bpm = parseFloat((60 * (mix.sampleRate / beatRateOf(mix))).toFixed(6))
  data.beatRate = mix.beatRate = beatRateOf(mix)

  return mix
}

const beatRateOf = context => {
  const rate = context.sampleRate
  const beat = 60 / context.bpm
  const ppq = Math.round(rate * beat)
  return ppq
}
