import './setup.js'
import LoopNode from '../src/loop-node.js'

xdescribe("LoopNode.start()", function () {
  this.timeout(5000)

  let node, context, rendered

  beforeEach(() => {
    context = new OfflineAudioContext({ numberOfChannels: 1, length: 32, sampleRate: 44100 })
    node = new LoopNode({ numberOfChannels: 1 })
    node.setBpm(2646000)
    node.connect(context.destination)
    node.start()
  })

  it("play buffer starting next bar in a loop", async () => {
    node.playBuffer([new Float32Array([1,2,3,4])])
    await new Promise(resolve => setTimeout(resolve, 300))
    const result = (await context.startRendering()).getChannelData(0)
    const expected = [
      0,0,0,0, 1,2,3,4, 1,2,3,4, 1,2,3,4,
      1,2,3,4, 1,2,3,4, 1,2,3,4, 1,2,3,4,
    ]
    expect(result).to.be.buffer(expected)
  })
})

// TODO:
// these tests below are flaky
// because we don't have control over
// when the worklet starts processing frames

describe("LoopNode.start()", function () {
  this.timeout(5000)

  let node, context, recorder, record, rendered

  before(() => {
    context = new AudioContext({ numberOfChannels: 1, sampleRate: 44100 })
  })

  beforeEach(async () => {
    node = new LoopNode({ numberOfChannels: 1 })
    await context.audioWorklet.addModule('/test/worklet-recorder.js')
    recorder = new AudioWorkletNode(context, 'recorder')
    recorder.connect(context.destination)
    record = async (result = []) => new Promise(resolve => {
      recorder.port.onmessage = e => {
        if (e.data === null) resolve(result)
        else result.push(e.data)
      }
    })
    // 2304 samples/beat, this is such so
    // it matches the recorder worklet window
    // so we get 4 array elements per bar
    node.setBpm(1148.4375)
    node.connect(recorder)
    node.start()
  })

  afterEach(() => {
    if (node.playing) node.stop(0)
    recorder.disconnect()
  })

  it("play buffer then set new buffer", async () => {
    node.playBuffer([new Float32Array(9216).fill(1)])
    node.onbar = () => {
      node.playBuffer([new Float32Array(9216).fill(2)])
      node.onbar = null
    }
    const result = await record()
    const expected = [
      1,1,1,1, 2,2,2,2, 2,2,2,2, 2,2,2,2,
      2,2,2,2, 2,2,2,2, 2,2,2,2, 2,2,2,2,
    ]
    expect(result).to.be.buffer(expected)
  })

  it("play buffer then set new buffer, then new buffer again", async () => {
    node.playBuffer([new Float32Array(9216).fill(1)])
    node.onbar = () => {
      node.playBuffer([new Float32Array(9216).fill(2)])
      node.onbar = () => {
        node.playBuffer([new Float32Array(9216).fill(3)])
        node.onbar = null
      }
    }
    const result = await record()
    const expected = [
      1,1,1,1, 2,2,2,2, 3,3,3,3, 3,3,3,3,
      3,3,3,3, 3,3,3,3, 3,3,3,3, 3,3,3,3,
    ]
    expect(result).to.be.buffer(expected)
  })

  it("play buffer, stop, then start", async () => {
    node.playBuffer([new Float32Array(9216).fill(1)])
    node.onbar = () => {
      node.onbar = null
      node.stop()
      node.onended = () => {
        node.start()
        node.playBuffer([new Float32Array(9216).fill(1)])
        node.onended = null
      }
    }
    const result = await record()
    const expected = [
      1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1,
      1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
    ]
    expect(result).to.be.buffer(expected)
  })

  it("play buffer, stop, then set new buffer and play", async () => {
    node.playBuffer([new Float32Array(9216).fill(1)])
    node.onbar = () => {
      node.onbar = null
      node.stop()
      node.onended = () => {
        node.start()
        node.playBuffer([new Float32Array(9216).fill(3)])
        node.onended = null
      }
    }
    const result = await record()
    const expected = [
      1,1,1,1, 0,0,0,0, 3,3,3,3, 3,3,3,3,
      3,3,3,3, 3,3,3,3, 3,3,3,3, 3,3,3,3,
    ]
    expect(result).to.be.buffer(expected)
  })

  it("play buffer then stop", async () => {
    node.playBuffer([new Float32Array(9216).fill(1)])
    setTimeout(() => {
      node.stop()
    }, (node.syncTime + 0.1 - node.currentTime) * 1000)
    const result = await record()
    const expected = [
      1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0,
      0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    ]
    expect(result).to.be.buffer(expected)
  })
})
