export default class LoopNode {
  constructor ({ numberOfChannels = 2 } = {}) {
    this.numberOfChannels = numberOfChannels
    this.currentBufferIndex = 0
    this.offsetTime = 0
  }

  get bpm () {
    return parseFloat(
      (60 * (
        this.sampleRate
      / getBeatRate(this.sampleRate, this._bpm)
      )
    ).toFixed(6))
  }

  get beatRate () {
    return getBeatRate(this.sampleRate, this.bpm)
  }

  get currentTime () {
    return this.context.currentTime - this.offsetTime
  }

  get sampleRate () {
    return this.context.sampleRate
  }

  get syncTime () {
    const bar = this.bufferSize / this.sampleRate
    const time = this.currentTime
    const remain = bar - (time % bar)
    return time + remain
  }

  get bufferSize () {
    return this.beatRate * 4
  }

  get currentBuffer () {
    return this.audioBuffers[this.currentBufferIndex]
  }

  get spareBuffer () {
    return this.audioBuffers[1 - this.currentBufferIndex]
  }

  resetTime (offset = 0) {
    this.offsetTime = this.context.currentTime + offset
  }

  swapIndex () {
    this.currentBufferIndex = 1 - this.currentBufferIndex
  }

  setBpm (bpm) {
    this._bpm = bpm
  }

  setBuffer (buffer) {
    for (let i = 0; i < this.numberOfChannels; i++) {
      const target = this.spareBuffer.getChannelData(i)
      if (target.length !== buffer[i].length) {
        throw new RangeError('loop node: buffer size provided unequal to internal buffer size: '
          + buffer[i].length + ' instead of ' + target.length)
      }
      target.set(buffer[i])
    }
    this.swapIndex()
    if (this.playing) {
      this.scheduleNext()
    }
  }

  _onended () {
    if (!this.playing) {
      this.currentNode?.disconnect()
      this.currentNode = null
      this.nextNode?.disconnect()
      this.nextNode = null
      return this.onended?.()
    }
    this.currentNode.disconnect()
    this.currentNode = this.nextNode
    this.nextNode = null
    this.onbar?.()
  }

  connect (destination) {
    this.context = destination.context
    this.destination = destination
    this.audioBuffers = [1,2].map(() =>
      this.context.createBuffer(
        this.numberOfChannels,
        this.bufferSize,
        this.sampleRate
      )
    )
  }

  scheduleNext (syncTime = this.syncTime) {
    if (this.nextNode) {
      throw new Error('loop node: next node schedule before previous being played')
    }
    const node = this.nextNode = this.context.createBufferSource()
    node.loop = true
    node.buffer = this.currentBuffer
    node.onended = () => this._onended()
    node.connect(this.destination)
    node.start(syncTime)
    if (!this.currentNode) {
      this.currentNode = this.nextNode
      this.nextNode = null
    } else {
      this.currentNode.stop(syncTime)
    }
  }

  start () {
    if (this.playing) {
      throw new Error('loop node: `start()` called twice')
    }
    this.playing = true
    this.scheduleNext()
  }

  stop (syncTime = this.syncTime) {
    if (!this.playing) {
      throw new Error('loop node: `stop()` called but has not started')
    }
    this.playing = false
    this.currentNode?.stop(syncTime)
    this.nextNode?.stop(syncTime)
  }
}

const getBeatRate = (sampleRate, bpm) => {
  return Math.round(sampleRate * (60 / bpm))
}
