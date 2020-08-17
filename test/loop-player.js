import './setup.js'
import mixWorker from '../src/mix-worker-service.js'
import LoopPlayer from '../src/loop-player.js'
import DynamicCache from '../dynamic-cache.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = window.__cache = new DynamicCache('test', { 'Content-Type': 'application/javascript' })
})

describe("LoopPlayer.start() : OfflineAudioContext", function () {
  this.timeout(5000)

  const opts = { bpm: 2646000, numberOfChannels: 1 }

  let player, context, rendered

  beforeEach(() => {
    context = new OfflineAudioContext({ numberOfChannels: 1, length: 32, sampleRate: 44100 })
  })

  it("render function and play in a loop", async () => {
    const fn = c => c.n1
    const player = new LoopPlayer(fn, opts)
    player.connect(context.destination)
    player.start()
    await new Promise(resolve => setTimeout(resolve, 300))
    const result = (await context.startRendering()).getChannelData(0)
    const expected = [
      0,0,0,0, 1,2,3,4, 1,2,3,4, 1,2,3,4,
      1,2,3,4, 1,2,3,4, 1,2,3,4, 1,2,3,4,
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })
})

      // 0,0,0,0,     1,2,3,4,     5,6,7,8,     9,10,11,12,
      // 13,14,15,16, 17,18,19,20, 21,22,23,24, 25,26,27,28,
// TODO:
// these tests below are flaky
// because we don't have control over
// when the worklet starts processing frames

describe("LoopPlayer.start() : AudioContext", function () {
  this.timeout(5000)

  // 2304 samples/beat, this is such so
  // it matches the recorder worklet window
  // so we get 4 array elements per bar
  const opts = { bpm: 1148.4375, numberOfChannels: 1 }

  let context, recorder, record, rendered

  before(() => {
    context = new AudioContext({ numberOfChannels: 1, sampleRate: 44100 })
  })

  beforeEach(async () => {
    await context.audioWorklet.addModule('/test/worklet-recorder.js')
    recorder = new AudioWorkletNode(context, 'recorder')
    recorder.connect(context.destination)
    record = async (result = []) => new Promise(resolve => {
      recorder.port.onmessage = e => {
        if (e.data === null) resolve(result)
        else result.push(e.data)
      }
    })
  })

  afterEach(() => {
    recorder.disconnect()
  })

  it("play fn then set new fn", async () => {
    const fn = c => 1
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    let bars = 0
    player.onbar = () => {
      player.fn = c => 2
      if (bars++ === 8) {
        player.stop(0)
        player.onbar = null
      }
    }
    const result = await record()
    const expected = [
      1,1,1,1, 2,2,2,2, 2,2,2,2, 2,2,2,2,
      2,2,2,2, 2,2,2,2, 2,2,2,2, 2,2,2,2,
    ]
    expect(result).to.be.buffer(expected)
  })

  it("play src", async () => {
    const code = `export default c => Math.ceil(c.n1/c.beatRate)`
    const url = await cache.put('a.js', code)
    mixWorker.update(url)
    const fn = c => c.src(url)
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    const result = await record()
    const expected = [
      1,2,3,4,     5,6,7,8,     9,10,11,12,  13,14,15,16,
      17,18,19,20, 21,22,23,24, 25,26,27,28, 29,30,31,32
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })

  it("play src, then update", async () => {
    const code = `export default c => 1`
    const url = await cache.put('a.js', code)
    mixWorker.update(url)
    const fn = c => c.src(url)
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    player.onbar = async () => {
      await cache.put('a.js', `export default c => 2`)
      mixWorker.update(url)
      player.onbar = null
    }
    const result = await record()
    const expected = [
      1,1,1,1, 2,2,2,2, 2,2,2,2, 2,2,2,2,
      2,2,2,2, 2,2,2,2, 2,2,2,2, 2,2,2,2,
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })

  it("play src, then update, keep correct n", async () => {
    const code = `export default c => Math.ceil(c.n1/c.beatRate)`
    const url = await cache.put('a.js', code)
    mixWorker.update(url)
    const fn = c => c.src(url)
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    player.onbar = async () => {
      await cache.put('a.js', `export default c => 1+Math.ceil(c.n1/c.beatRate)`)
      mixWorker.update(url)
      player.onbar = null
    }
    const result = await record()
    const expected = [
      1,2,3,4,     6,7,8,9,     10,11,12,13, 14,15,16,17,
      18,19,20,21, 22,23,24,25, 26,27,28,29, 30,31,32,33
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })

  it("play src, then update twice", async () => {
    const code = `export default c => 1`
    const url = await cache.put('a.js', code)
    mixWorker.update(url)
    const fn = c => c.src(url)
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    player.onbar = async () => {
      await cache.put('a.js', `export default c => 2`)
      mixWorker.update(url)
      setTimeout(async () => {
        await cache.put('a.js', `export default c => 3`)
        mixWorker.update(url)
      }, 1)
      player.onbar = null
    }
    const result = await record()
    const expected = [
      1,1,1,1, 3,3,3,3, 3,3,3,3, 3,3,3,3,
      3,3,3,3, 3,3,3,3, 3,3,3,3, 3,3,3,3,
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })

  it("play src, then update twice, keep correct n", async () => {
    const code = `export default c => Math.ceil(c.n1/c.beatRate)`
    const url = await cache.put('a.js', code)
    mixWorker.update(url)
    const fn = c => c.src(url)
    const player = new LoopPlayer(fn, opts)
    player.connect(recorder)
    player.start()
    player.onbar = async () => {
      await cache.put('a.js', `export default c => 1+Math.ceil(c.n1/c.beatRate)`)
      setTimeout(async () => {
        await cache.put('a.js', `export default c => 2+Math.ceil(c.n1/c.beatRate)`)
        mixWorker.update(url)
      }, 1)
      mixWorker.update(url)
      player.onbar = null
    }
    const result = await record()
    const expected = [
      1,2,3,4,     7,8,9,10,    11,12,13,14, 15,16,17,18,
      19,20,21,22, 23,24,25,26, 27,28,29,30, 31,32,33,34
    ]
    expect(result).to.be.buffer(expected)
    player.stop(0)
  })
})
//   it("play buffer then set new buffer, then new buffer again", async () => {
//     player.playBuffer([new Float32Array(9216).fill(1)])
//     player.onbar = () => {
//       player.playBuffer([new Float32Array(9216).fill(2)])
//       player.onbar = () => {
//         player.playBuffer([new Float32Array(9216).fill(3)])
//         player.onbar = null
//       }
//     }
//     const result = await record()
//     const expected = [
//       1,1,1,1, 2,2,2,2, 3,3,3,3, 3,3,3,3,
//       3,3,3,3, 3,3,3,3, 3,3,3,3, 3,3,3,3,
//     ]
//     expect(result).to.be.buffer(expected)
//   })

//   it("play buffer, stop, then start", async () => {
//     player.playBuffer([new Float32Array(9216).fill(1)])
//     player.onbar = () => {
//       player.onbar = null
//       player.stop()
//       player.onended = () => {
//         player.start()
//         player.playBuffer([new Float32Array(9216).fill(1)])
//         player.onended = null
//       }
//     }
//     const result = await record()
//     const expected = [
//       1,1,1,1, 0,0,0,0, 1,1,1,1, 1,1,1,1,
//       1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1,
//     ]
//     expect(result).to.be.buffer(expected)
//   })

//   it("play buffer, stop, then set new buffer and play", async () => {
//     player.playBuffer([new Float32Array(9216).fill(1)])
//     player.onbar = () => {
//       player.onbar = null
//       player.stop()
//       player.onended = () => {
//         player.start()
//         player.playBuffer([new Float32Array(9216).fill(3)])
//         player.onended = null
//       }
//     }
//     const result = await record()
//     const expected = [
//       1,1,1,1, 0,0,0,0, 3,3,3,3, 3,3,3,3,
//       3,3,3,3, 3,3,3,3, 3,3,3,3, 3,3,3,3,
//     ]
//     expect(result).to.be.buffer(expected)
//   })

//   it("play buffer then stop", async () => {
//     player.playBuffer([new Float32Array(9216).fill(1)])
//     setTimeout(() => {
//       player.stop()
//     }, (player.syncTime + 0.1 - player.currentTime) * 1000)
//     const result = await record()
//     const expected = [
//       1,1,1,1, 0,0,0,0, 0,0,0,0, 0,0,0,0,
//       0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
//     ]
//     expect(result).to.be.buffer(expected)
//   })
// })
