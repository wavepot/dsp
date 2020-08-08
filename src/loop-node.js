export default class LoopNode {
  constructor ({ numberOfChannels = 2 } = {}) {
    this.numberOfChannels = numberOfChannels
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

  resetTime (offset = 0) {
    this.offsetTime = this.context.currentTime + offset
  }

  setBpm (bpm) {
    this._bpm = bpm
  }

  playBuffer (buffer) {
    this.playing = true

    const output = this.context.createBuffer(
      this.numberOfChannels,
      this.bufferSize,
      this.sampleRate
    )

    for (let i = 0; i < this.numberOfChannels; i++) {
      const target = output.getChannelData(i)
      if (target.length !== buffer[i].length) {
        throw new RangeError('loop node: buffer size provided unequal to internal buffer size: '
          + buffer[i].length + ' instead of ' + target.length)
      }
      target.set(buffer[i])
    }

    this.scheduleNext(this.syncTime, output)
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
    // this.audioBuffers = [1,2,3,4,5].map(() =>
    //   this.context.createBuffer(
    //     this.numberOfChannels,
    //     this.bufferSize,
    //     this.sampleRate
    //   )
    // )
  }

  scheduleNext (syncTime = this.syncTime, buffer) {
    if (this.nextNode) {
      this.nextNode.onended = null
      for (let i = 0; i < this.numberOfChannels; i++) {
        this.nextNode.buffer.getChannelData(i).fill(0)
      }
      this.nextNode.stop()
      this.nextNode.disconnect()
      console.warn('loop node: next node schedule before previous being played')
    }
    const node = this.nextNode = this.context.createBufferSource()
    node.loop = true
    node.buffer = buffer
    node.onended = () => this._onended()
    node.connect(this.destination)
    console.log('schedule for', syncTime.toFixed(1))
    node.start(syncTime)
    if (!this.currentNode) {
      this.currentNode = this.nextNode
      this.nextNode = null
    } else {
      this.currentNode.stop(syncTime)
    }
  }

  // start () {
  //   if (this.playing) {
  //     throw new Error('loop node: `start()` called twice')
  //   }
  //   this.playing = true
  //   // this.scheduleNext()
  // }

  stop (syncTime = this.syncTime) {
    // if (!this.playing) {
    //   throw new Error('loop node: `stop()` called but has not started')
    // }
    this.playing = false
    this.currentNode?.stop(syncTime)
    this.nextNode?.stop(syncTime)
  }
}

const getBeatRate = (sampleRate, bpm) => {
  return Math.round(sampleRate * (60 / bpm))
}
