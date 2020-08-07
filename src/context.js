import randomId from '../lib/random-id.js'

export default class Context {
  constructor (data) {
    this.id = randomId()
    this.n = 0
    this.bpm = 60
    this.beatRate = 44100
    this.sampleRate = 44100

    Object.entries(this.constructor.nonEnumerableProps())
      .forEach(([key, value]) => Object
        .defineProperty(this, key, {
          value: value,
          enumerable: false,
          writable: true
        }))

    Object.assign(this, data)
  }

  tick () {
    this.n++
    this.p++
  }

  get checksum () {
    let sum = ''
    for (const key in this) {
      if (key === 'parent') continue
      if (Array.isArray(this[key])) {
        sum += '' + key + this[key].map(el => el.length)
      } else {
        sum += '' + key + this[key]
      }
    }
    return sum
  }

  set checksum (value) {
    /* ignore */
  }

  toJSON () {
    const json = {}
    for (const key in this) {
      if (typeof this[key] !== 'function') {
        json[key] = this[key]
      }
    }
    // delete json.g
    // delete json.worker
    // delete json.parent
    json.checksum = this.checksum
    return json
  }

  static nonEnumerableProps () {
    return {
      // n: 0, // global frame position
      p: 0, // local frame position
    }
  }

  // global time = since user hit play
  // local time = since begin of this buffer

  // global time in seconds: s=1=1 sec
  get s () { return (1+this.n) / this.sampleRate }
  // global time beat synced: b=1=1 beat
  get b () { return (1+this.n) / this.beatRate }

  // local time in seconds (since the start of this buffer)
  get t () { return (1+this.p) / this.sampleRate % this.sampleRate }
  // local time beat synced: k=1=1 beat (since the start of this buffer)
  get k () { return (1+this.p) / this.beatRate % this.beatRate }

  // input=L+R of current buffer frame
  // input[0]=L
  // input[1]=R if stereo, otherwise L
  get input () {
    const { buffer, p } = this
    return {
      get ['0'] () {
        return buffer[0][p]
      },
      get ['1'] () {
        return buffer[1]?.[p] ?? buffer[0][p]
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
