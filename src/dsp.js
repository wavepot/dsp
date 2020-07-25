import render from './render.js'

export const mix = (...fns) => (data, params) => {
  let context = {}
  for (const fn of fns) {
    context = Context(data).merge(context)
    render(fn, context, params)
  }
  Object.assign(data, context)
}

const proto = {
  valueOf: {
    value () { return this.t }
  },
  n: {
    value: 0,
    enumerable: true,
    writable: true
  },
  t: {
    enumerable: false,
    get () { return (1 + this.n) / this.beatRate }
  },
  s: {
    enumerable: false,
    get () { return (1 + this.n) / this.sampleRate }
  },
  p: {
    enumerable: false,
    get () { return this.n % this.bufferSize }
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
    value: 44100 / 60,
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

  const mix = (...fns) => {
    for (const fn of fns) {
      context = Context(data).merge(context)
      render(fn, context, params)
    }
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
