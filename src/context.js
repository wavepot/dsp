import randomId from '../lib/random-id.js'
import checksumOf from '../lib/checksum.js'
import mixWorker from './mix-worker-service.js'
import rpc from './lazy-singleton-worker-rpc.js'

const BUFFER_SERVICE_URL = new URL('buffer-service.js', import.meta.url).href

const checksums = {}

const INTEGRATORS = {
  // global frame position
  n: c => c.frame,
  // local frame position
  p: c => c.position,

  // global time = since user hit play
  // global time in seconds: s=1=1 sec
  s: c => (1+c.frame) / c.sampleRate,
  // global time beat synced: b=1=1 beat
  b: c => (1+c.frame) / c.beatRate,

  // local time = since begin of this buffer
  // local time in seconds (since the start of this buffer)
  t: c => (1+c.position) / c.sampleRate,
  // local time beat synced: k=1=1 beat (since the start of this buffer)
  k: c => (1+c.position) / c.beatRate,

  // current frame sample value of current scope buffer
  x: c => +c.input
}

export default class Context {
  static nonEnumerableProps (context) {
    return {
      position: 0, // local frame position
      parent: null,
      ref: context
    }
  }

  constructor (data) {
    this.id = randomId()
    this.ig = 'x'

    this.frame = 0
    this.bpm = 60
    this.beatRate = 44100
    this.sampleRate = 44100

    Object.entries(this.constructor.nonEnumerableProps(this))
      .forEach(([key, value]) => {
        Object.defineProperty(this, key, {
          value,
          writable: true,
          enumerable: false,
          configurable: false
        })
      })

    Object.keys(INTEGRATORS).forEach(key => {
      const contextKey = '__' + key
      Object.defineProperty(this, key, {
        get () {
          if (contextKey in this) {
            return this[contextKey]
          } else {
            const newContext = typeof this === 'function'
              ? this.clone({ ig: key, ref: this.ref })
              : new Context({ ...this, ig: key, ref: this.ref })

            Object.defineProperty(this, contextKey, {
              value: newContext,
              writable: false,
              enumerable: false,
              configurable: false
            })

            return this[contextKey]
          }
        },
        set (value) {
          if (key === 'n') {
            this.frame = value
          } else {
            throw new TypeError('Attempt to rewrite integrator: ' + key)
          }
        },
        enumerable: false,
        configurable: false
      })
    })

    Object.assign(this, data)
  }

  // public api

  new (...args) {
    return this(c => c(
      c => new Promise(async resolve => {
        c.buffer = (await rpc(BUFFER_SERVICE_URL, 'getBuffer', [
          c.childId,
          (c.len ?? c.buffer[0].length)|0,
          (c.ch ?? c.buffer.length)|0
        ])).buffer
        resolve()
      }),
      ...args
    ))
    // return this(...args)
  }

  zero (...args) {
    args.unshift(c => { c.buffer.forEach(b => b.fill(0)) })
    return this(...args)
  }

  src (url, ...args) {
    return this(c => c(
      async c => {
        c.url = new URL(url, c.url).href
        // const checksum = c.checksum

        // if (checksums[c.url + c.id] === checksum) return

        // checksums[c.url + c.id] = checksum
      // console.log('here!')
        await mixWorker(c.url, c)
      },
      ...args
    ))
  }

  // internals

  tick () {
    this.frame++
    this.position++
  }

  get checksum () {
    return checksumOf(this)
  }

  set checksum (value) {
    /* ignore */
  }

  get bufferSize () { return this.buffer[0].length }

  get sr () { return this.sampleRate }
  get br () { return this.beatRate }

  toJSON () {
    const json = {}
    for (const key in this) {
      if (key[0] === '_') continue
      if (typeof this[key] !== 'function') {
        json[key] = this[key]
      }
    }
    // delete json.g
    // delete json.worker
    // delete json.parent
    json.n = this.frame
    json.checksum = this.checksum
    return json
  }

  valueOf () {
    return INTEGRATORS[this.ig](this.ref)
  }

  // input=L+R of current buffer frame
  // input[0]=L
  // input[1]=R if stereo, otherwise L
  get input () {
    const { buffer, position: p } = this.ref
    return {
      get ['0'] () {
        return buffer[0][p] ?? 0
      },
      get ['1'] () {
        return buffer?.[1][p] ?? buffer[0][p]
      },
      valueOf () {
        if (buffer.length === 2) {
          return this[0] + this[1]
        } else {
          return this[0]
        }
      }
    }
  }
}
