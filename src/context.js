import randomId from '../lib/random-id.js'
import checksumOf from '../lib/checksum.js'
import mixWorker from './mix-worker-service.js'
import mixBuffers from './mix-buffers.js'
import rpc from './lazy-singleton-worker-rpc.js'

const BUFFER_SERVICE_URL = new URL('buffer-service.js', import.meta.url).href

const checksums = {}

// const INTEGRATORS = {
//   // global frame position
//   n: c => c.frame,
//   // local frame position
//   p: c => c.position,

//   // global time = since user hit play
//   // global time in seconds: s=1=1 sec
//   s: c => (1+c.frame) / c.sampleRate,
//   // global time beat synced: b=1=1 beat
//   b: c => (1+c.frame) / c.beatRate,

//   // local time = since begin of this buffer
//   // local time in seconds (since the start of this buffer)
//   t: c => (1+c.position) / c.sampleRate,
//   // local time beat synced: k=1=1 beat (since the start of this buffer)
//   k: c => (1+c.position) / c.beatRate,

//   // current frame sample value of current scope buffer
//   x: c => +c.input
// }

export default class Context {
  static nonEnumerableProps (context) {
    return {
      // n: 0, // global frame position
      c: context,
      parent: null,
      p: 0, // local frame position
      s: 0,
      b: 0,
      t: 0,
      k: 0,
      n1: 1,
      p1: 1,
      sr: 44100,
      br: 44100,
    }
  }

  constructor (data) {
    this.id = randomId()

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

    // Object.keys(INTEGRATORS).forEach(key => {
    //   const contextKey = '__' + key
    //   Object.defineProperty(this, key, {
    //     get () {
    //       if (contextKey in this) {
    //         return this[contextKey]
    //       } else {
    //         const newContext = typeof this === 'function'
    //           ? this.clone({ ig: key, ref: this.ref })
    //           : new Context({ ...this, ig: key, ref: this.ref })

    //         Object.defineProperty(this, contextKey, {
    //           value: newContext,
    //           writable: false,
    //           enumerable: false,
    //           configurable: false
    //         })

    //         return this[contextKey]
    //       }
    //     },
    //     set (value) {
    //       if (key === 'n') {
    //         this.frame = value
    //       } else {
    //         throw new TypeError('Attempt to rewrite integrator: ' + key)
    //       }
    //     },
    //     enumerable: false,
    //     configurable: false
    //   })
    // })

    Object.assign(this, data)

    this.prepare()
  }

  // public api

  async buf ({ id = '', len = this.buffer[0].length, ch = this.buffer.length } = {}) {
    return (await rpc(BUFFER_SERVICE_URL, 'getBuffer', [
      id+checksumOf(this),
      len|0,
      ch|0
    ]))
  }

  zero (buffer = this.buffer) {
    buffer.forEach(b => b.fill(0))
    return buffer
  }

  src (url, params = {}) {
    this.url = new URL(url, this.url ?? location.href).href
      // const checksum = c.checksum

      // if (checksums[c.url + c.id] === checksum) return

      // checksums[c.url + c.id] = checksum
    // console.log('here!')
    return mixWorker(this.url, Object.assign(this.toJSON(), params))
  }

  mix(...args) {
    return mixBuffers(...args)
  }

  // internals

  prepare () {
    this.c = this

    this.sr = this.sampleRate
    this.br = this.beatRate

    this.n = this.n ?? 0
    this.p = 0

    this.n1 = this.n+1
    this.p1 = this.p+1

    this.s = this.n1 / this.sr
    this.b = this.n1 / this.br

    this.t = this.p1 / this.sr
    this.k = this.p1 / this.br
  }

  tick () {
    this.n = ++this.n
    this.p = ++this.p

    this.n1 = this.n+1
    this.p1 = this.p+1

    this.s = this.n1 / this.sr
    this.b = this.n1 / this.br

    this.t = this.p1 / this.sr
    this.k = this.p1 / this.br
  }

  // get checksum () {
  //   return checksumOf(this)
  // }

  // set checksum (value) {
  //   /* ignore */
  // }

  get bufferSize () { return this.buffer[0].length }

  // get c () { return this }
  // get sr () { return this.sampleRate }
  // get br () { return this.beatRate }

  toJSON () {
    const json = {}
    // this.prepare()
    for (const key in this) {
      if (key[0] === '_') continue
      if (typeof this[key] !== 'function') {
        json[key] = this[key]
      }
    }
    // delete json.g
    // delete json.worker
    // delete json.parent
    // json.n = this.n
    // json.frame = this.frame
    // json.checksum = this.checksum
    return json
  }

  // input=L+R of current buffer frame
  // input[0]=L
  // input[1]=R if stereo, otherwise L
  get input () {
    return this.buffer.map(buf => buf[this.p])
  }

  get x () {
    return this.buffer[0][this.p]
      + (this.buffer[1]?.[this.p]??0)
  }
}
