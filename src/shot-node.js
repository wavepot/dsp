export default class ShotNode {
  constructor ({ numberOfChannels = 2 } = {}) {
    this.numberOfChannels = numberOfChannels
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

  get sampleRate () {
    return this.context.sampleRate
  }

  get bufferSize () {
    return this.sampleRate
  }

  setBpm (bpm) {
    this._bpm = bpm
  }

  setBuffer (buffer) {
    for (let i = 0; i < this.numberOfChannels; i++) {
      const target = this.audioBuffer.getChannelData(i)
      if (target.length !== buffer[i].length) {
        throw new RangeError('shot node: buffer size provided unequal to internal buffer size: '
          + buffer[i].length + ' instead of ' + target.length)
      }
      target.set(buffer[i])
    }
  }

  connect (destination) {
    this.context = destination.context
    this.destination = destination
    this.audioBuffer = this.context.createBuffer(
      this.numberOfChannels,
      this.bufferSize,
      this.sampleRate
    )
  }

  start () {
    const node = this.node = this.context.createBufferSource()
    node.buffer = this.audioBuffer
    node.connect(this.destination)
    node.start(this.context.currentTime+0.1)
  }
}

const getBeatRate = (sampleRate, bpm) => {
  return Math.round(sampleRate * (60 / bpm))
}
