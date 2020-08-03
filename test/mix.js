import './setup.js'
import Mix from '../src/mix.js'

describe("mix = Mix(context)", () => {
  it("returns a mix function", () => {
    const mix = Mix({})
    expect(mix).to.be.a('function')
  })
})

describe("mix(fn)", () => {
  it("renders fn into buffer", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = ({ n }) => n
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  })

  it("fn does not rewrite n", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = ({ n }) => n
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  })

  it("fn accept additional context data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = ({ n }) => n
    await mix(fn, { n: 2 })
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
  })

  it("async fn accept additional context data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => ({ n }) => n
    await mix(fn, { n: 2 })
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
  })

  it("async closure fn accept additional context data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      ({ n }) => n
    ]
    await mix(fn, { n: 2 })
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
  })

  it("async fn", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => ({ n }) => n
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  })

  it("async fn create closure once", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    let x = 0
    const fn = async () => {
      x++
      return ({ n }) => n + x
    }
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([1,2,3,4])
    expect(x).to.equal(1)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([1,2,3,4])
    expect(x).to.equal(1)
  })

  it("update context with given data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = ({ n }) => n
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    await mix(fn, { n: 10 })
    expect(context.buffer[0]).to.be.buffer([10,11,12,13])
  })

  it("mix waterfall", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      c => c.input + 1,
      c => c.input + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
  })

  it("mix waterfall complex", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      c => c.input + 1,
      c => c(
        c => c.input + 2,
        c => c.input + 3
      )
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([6,7,8,9])
  })

  it("mix waterfall complex async", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      async () => c => c.input + 1,
      c => c(
        async () => c => c.input + 2,
        c => c.input + 3
      )
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([6,7,8,9])
    await mix(fn, { n: 1 })
    expect(context.buffer[0]).to.be.buffer([7,8,9,10])
  })
})
