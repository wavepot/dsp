class Recorder extends AudioWorkletProcessor {
  constructor () {
    super()
    this.i = 0
    this.result = 0
    this.started = false
    console.log('worklet clock started:', currentTime)
  }

  process (inputs) {
    const data = inputs[0][0]

    let result = 0
    if (data) {
      result = Math.max(this.result, ...data)
    }

    if (result || this.started) {
      this.started = true
      this.result = result
      ++this.i
    } else {
      this.result = 0
    }

    if (this.i > 0 && this.i % (9*2) === 0) {
      this.port.postMessage(this.result)
    }

    if (this.i === 32*9*2) {
      this.port.postMessage(null)
      return false
    }

    return true
  }
}

registerProcessor('recorder', Recorder)
