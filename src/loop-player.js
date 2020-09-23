import atomic from '../lib/atomic.js'
import LoopNode from './loop-node.js'
import Mix from './mix.js'
import mixWorker from './mix-worker-service.js'
import Shared32Array from '../lib/shared-array-buffer.js'
import './global-service.js'

mixWorker.queueUpdates = true

export default class LoopPlayer {
  constructor (name, fn, { numberOfChannels = 2, bpm = 125 } = {}) {
    this.name = name
    this.fn = fn
    this.bpm = bpm
    this.numberOfChannels = numberOfChannels
    this.node = new LoopNode({ numberOfChannels, bpm })
    this.node.onbar = () => {
      this.context.n += this.buffer[0].length

      if (this.onbar) {
        ;(async () => {
          await this.onbar()
          this.render()
        })()
      } else {
        this.render()
      }
    }
    this.playing = false

    this.render = atomic(
      (...args) => this._render(...args), {
        recentOnly: true,
        timeout: 5000
      })

    this.renderInitial = atomic(
      (...args) => this._render(...args), {
        recentOnly: true,
        timeout: 60000
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

  async _render ({ initial = false } = {}) {
    if (!this.playing) return

    mixWorker.flushUpdates()

    const time = performance.now()

    let n = this.context.n

    if (this.node.remainTime < this.avgRenderTime) {
      console.warn(`[${this.name}] not enough time, trying for next buffer:`, this.node.remainTime, this.avgRenderTime)
      n += this.buffer[0].length
    }
    // console.log(this.node.remainTime)

    console.log(`[${this.name}] will render:`, n)
    try {
      await this.mix(this.fn, { n })
    } catch (error) {
      this.onerror?.(error)
      console.error(this.name, error)
      return
    }

    // if (this.context.n) {
    //   console.warn('too late, discard:', n, this.context.n)
    //   return
    // }

    if (this.mix.n < this.context.n) {
      console.warn(`[${this.name}] too late, discard:`, this.mix.n, this.context.n)
      return
    }

    if (!this.playing) {
      console.warn(`[${this.name}] not playing, discard:`, n)
      return
    }

    const diff = performance.now() - time
    console.log(`[${this.name}] render took:`, diff)
    if (diff > 1000) console.warn('too slow!', (diff/1000).toFixed(1) + 's' )

    this.maxRenderTime = Math.max(diff/1000, this.maxRenderTime)
    if (this.avgRenderTime === -1) {
      this.avgRenderTime = diff/1000
    } else {
      this.avgRenderTime = (diff/1000 + this.avgRenderTime) / 2
    }
    // this.avgRenderTime = Math.max(diff/1000, this.maxRenderTime)

    console.log(`[${this.name}] will play:`, n)
    if (initial) {
      // this.node.resetTime?.(-3)
      this.node.start()
    }

    this.node.playBuffer(this.buffer)

    this.onrender?.(this.buffer)
  }

  start () {
    this.maxRenderTime = 0
    this.avgRenderTime = -1
    this.playing = true
    this.renderInitial({ initial: true })
  }

  stop (syncTime) {
    this.playing = false
    this.node.stop(syncTime)
    mixWorker.clear()
  }
}
