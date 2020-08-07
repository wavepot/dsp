
export class Shared32Array extends Float32Array {
  constructor (length) {
    super(new SharedArrayBuffer(length * Float32Array.BYTES_PER_ELEMENT))
  }
}

class MixBuffer {
  constructor (numberOfChannels, length) {
    this.buffers = Array.from(
      Array(numberOfChannels),
      () => new Shared32Array(size)
    )

    this.numberOfChannels = numberOfChannels
  }
}
