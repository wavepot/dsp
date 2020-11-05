import randomId from '../lib/random-id.js'
import checksumOf from '../lib/checksum.js'
import ImpulseReverb from '../lib/impulse-reverb.js'
import ImpulseReverbStereo from '../lib/impulse-reverb-stereo.js'
import mixWorker from './mix-worker-service.js'
import mixBuffers from './mix-buffers.js'
import rpc from './lazy-singleton-worker-rpc.js'

const BUFFER_SERVICE_URL = 'main:buffer-service'
const SAMPLE_SERVICE_URL = 'main:sample-service'
const GLOBAL_SERVICE_URL = 'main:global-service'

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
    this.id = data.id ?? randomId()

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

  buf ({ id = '', len = this.bufferSize, ch = this.buffer.length } = {}) {
    return rpc(BUFFER_SERVICE_URL, 'getBuffer', [
      id+checksumOf(this),
      len|0,
      ch|0
    ])
  }

  get (id) {
    return rpc(GLOBAL_SERVICE_URL, 'get', [id])
  }

  set (id, value, ttl) {
    return rpc(GLOBAL_SERVICE_URL, 'set', [id, value, ttl])
  }

  sample (url) {
    return rpc(SAMPLE_SERVICE_URL, 'fetchSample', [url])
  }

  reverb (params) {
    return ImpulseReverb(this, params)
  }

  reverbStereo (params) {
    return ImpulseReverbStereo(this, params)
  }

  zero (buffer = this.buffer) {
    buffer.forEach(b => b.fill(0))
    return buffer
  }

  src (url, params = {}) {
    const targetUrl = new URL(url, this.url ?? location.href).href
    const context = Object.assign(this.toJSON(), params, { url: targetUrl })
    return mixWorker(targetUrl, context).then(result => {
      result.update = c => { c.src(url, params) }
      return result
    })
  }

  async render (name, params) {
    const id = name + checksumOf(params)
    const buffer  = await this.buf({ ...params, id })
    if (buffer.createdNow) {
      console.log('shall render', name, id, buffer, params)
      await this.src('./' + name + '.js', { buffer, ...params, id })
    }
    return buffer
  }

  mix (...args) {
    return mixBuffers(...args)
  }

  async import (sources) {
    const entries = await Promise.all(
      Object.entries(sources)
        .map(async ([key, value]) => {
          const params = { ...value }
          delete params.src
          const buffer = await this.render(value.src ?? key, {
            id: key,
            ...params,
          })
          return [key, buffer]
        }))

    return Object.fromEntries(entries)
  }

  // async import (sources) {
  //   const entries = await Promise.all(
  //     Object.entries(sources)
  //       .map(async ([key, value]) => {
  //         const buffer = value.buffer ?? await this.buf({
  //           id: value.id ?? key,
  //           len: value.len ?? this.br,
  //           ch: value.ch ?? 1,
  //         })
  //         const params = { ...value }
  //         delete params.src
  //         const src = await this.src('./' + (value.src ?? key) + '.js', {
  //           id: key,
  //           ...params,
  //           buffer
  //         })
  //         return [key, buffer]
  //       }))

  //   return Object.fromEntries(entries)
  // }

  // internals

  prepare () {
    this.c = this

    this.sr = this.sampleRate
    this.br = this.beatRate

    this.n = this.n ?? 0
    this.p = 0

    this.update()
  }

  tick () {
    this.n = ++this.n
    this.p = ++this.p

    this.update()
  }

  tickBar () {
    this.n += this.buffer[0].length
    this.p += this.buffer[0].length

    this.update()
  }

  update () {
    this.n1 = this.n+1
    this.p1 = this.p+1

    this.s = this.n1 / this.sr
    this.b = this.n1 / this.br

    this.t = this.p1 / this.sr
    this.k = this.p1 / this.br
  }

  get bufferSize () { return this.buffer[0].length*4 }

  toJSON () {
    const json = {}
    for (const key in this) {
      if (key[0] === '_') continue
      if (typeof this[key] !== 'function') {
        json[key] = this[key]
      }
    }
    return json
  }

  // input=L+R of current buffer frame
  // input[0]=L
  // input[1]=R if stereo, otherwise L
  get input () {
    return [
      this.buffer[0][this.p],
      this.buffer[1]?.[this.p]??this.buffer[0][this.p]
    ]
  }

  get x () {
    return this.buffer[0][this.p]
      + (this.buffer[1]?.[this.p]??0)
  }
}
