import './setup.js'
import RingBuffer from '../lib/ring-buffer.js'

describe("new RingBuffer(buffer)", () => {
  let buffer
  let ring

  it("create a ring buffer for a given buffer", () => {
    buffer = new Float32Array(3)
    ring = new RingBuffer(buffer)
    expect(ring.length).to.equal(3)
  })

  it("set operation should increment position", () => {
    ring[0] = 1
    expect(buffer).to.be.buffer([1,0,0])
    expect(ring).to.be.buffer([0,0,1])
    ring[0] = 2
    expect(buffer).to.be.buffer([1,2,0])
    expect(ring).to.be.buffer([0,1,2])
    ring[0] = 3
    expect(buffer).to.be.buffer([1,2,3])
    expect(ring).to.be.buffer([1,2,3])

    expect(ring[-5]).to.equal(2)
    expect(ring[-4]).to.equal(3)
    expect(ring[-3]).to.equal(1)
    expect(ring[-2]).to.equal(2)
    expect(ring[-1]).to.equal(3)
    expect(ring[0]).to.equal(1)
    expect(ring[1]).to.equal(2)
    expect(ring[2]).to.equal(3)
    expect(ring[3]).to.equal(1)
    expect(ring[4]).to.equal(2)

    ring[0] = 4
    expect(buffer).to.be.buffer([4,2,3])
    expect(ring).to.be.buffer([2,3,4])
  })

  it("should fail", () => {
    // const bus = new BroadcastChannel('bus')
    postMessage({ ring })
    // postMessage({ ring: ring.toJSON() })
  })
})
