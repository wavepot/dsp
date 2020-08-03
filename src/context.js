export default class Context {
  constructor (data) {
    this.bpm = 60
    this.sampleRate = 44100
    this.beatRate = 44100

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

  static nonEnumerableProps () {
    return {
      n: 0, // global frame position
      p: 0, // local frame position
    }
  }

  // global time = since user hit play
  // local time = since begin of this buffer

  // global time in seconds: s=1=1 sec
  get s () { return this.n % this.sampleRate }
  // global time beat synced: b=1=1 beat
  get b () { return this.n % this.beatRate }

  // local time in seconds (since the start of this buffer)
  get t () { return this.p % this.sampleRate }
  // local time beat synced: k=1=1 beat (since the start of this buffer)
  get k () { return this.p % this.beatRate }

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
