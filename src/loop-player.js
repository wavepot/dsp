import atomic from '../lib/atomic.js'
import LoopNode from './loop-node.js'
import Mix from './mix.js'
import mixWorker from './mix-worker-service.js'
import Shared32Array from '../lib/shared-array-buffer.js'
import './global-service.js'

export default class LoopPlayer {
  constructor (fn, { numberOfChannels = 2, bpm = 125 } = {}) {
    this.fn = fn
    this.bpm = bpm
    this.numberOfChannels = numberOfChannels
    this.node = new LoopNode({ numberOfChannels, bpm })
    this.node.onbar = () => {
      this.onbar?.()
      this.render()
    }
    this.playing = false
    this.nextNToPlay = 0
    this.render = atomic(
      (...args) => this._render(...args), {
        recentOnly: true,
        timeout: 5000
      })
  }

  connect (destination) {
    this.node.connect(destination)
    this.buffer = Array(this.numberOfChannels).fill(0).map(() =>
      new Shared32Array(this.node.bufferSize))
    this.context = {
      n: 0,
      bpm: this.node.bpm, // NOTE: node.bpm !== this.bpm
      beatRate: this.node.beatRate,
      sampleRate: this.node.sampleRate,
      buffer: this.buffer
    }
    this.mix = Mix(this.context)
  }

  async _render ({ first = false } = {}) {
    if (!this.playing) return

    mixWorker.flushUpdates()

    const time = performance.now()
    const n = this.context.n

    console.log('will render:', n)
    try {
      await this.mix(this.fn, { n })
    } catch (error) {
      this.onerror?.(error)
      console.error(error)
      return
    }

    if (n !== this.nextNToPlay) {
      console.warn('too late, discard:', n, this.nextNToPlay)
      return
    }

    if (!this.playing) {
      console.warn('not playing, discard:', n)
      return
    }

    const diff = performance.now() - time
    console.log('time to render:', diff)
    if (diff > 1000) console.warn('too slow!', (diff/1000).toFixed(1) + 's' )

    console.log('will play:', n)
    if (first) {
      // this.node.resetTime?.(-3)
      this.node.start()
    }

    this.context.n += this.buffer[0].length
    this.nextNToPlay = this.context.n

    this.node.playBuffer(this.buffer)

    this.onrender?.(this.buffer)
  }

  start () {
    this.playing = true
    this.render({ first: true })
  }

  stop (syncTime) {
    this.playing = false
    this.node.stop(syncTime)
    mixWorker.clear()
  }
}
