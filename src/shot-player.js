import ShotNode from './shot-node.js'
import Mix from './mix.js'
import mixWorker from './mix-worker-service.js'
import Shared32Array from '../lib/shared-array-buffer.js'
import './global-service.js'

export default class ShotPlayer {
  constructor (fn, { numberOfChannels = 2, bpm = 125 } = {}) {
    this.fn = fn
    this.bpm = bpm
    this.numberOfChannels = numberOfChannels
    this.node = new ShotNode({ numberOfChannels, bpm })
  }

  connect (destination) {
    this.node.connect(destination)
    this.buffer = Array(this.numberOfChannels).fill(0).map(() =>
      new Shared32Array(this.node.bufferSize))
    this.context = {
      n: 0,
      bpm: this.node.bpm ,// NOTE: node.bpm !== this.bpm
      beatRate: this.node.beatRate,
      sampleRate: this.node.sampleRate,
      buffer: this.buffer
    }
    this.mix = Mix(this.context)
  }

  async render () {
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

    const diff = performance.now() - time
    console.log('time to render:', diff)
    if (diff > 1000) console.warn('too slow!', (diff/1000).toFixed(1) + 's' )

    console.log('will play:', n)

    this.node.setBuffer(this.buffer)
    this.node.start()
    this.onrender?.(this.buffer)
  }

  start () {
    this.render()
  }
}
