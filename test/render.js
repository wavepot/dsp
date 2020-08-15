import './setup.js'
import render from '../src/render.js'

describe("await render(fn, context)", () => {
  it("increment `n` in place", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    await render(() => 0, context)
    expect(context.n).to.equal(4)
  })

  it("NaN should throw", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    let error
    try {
      await render(() => NaN, context)
    } catch (e) {
      error = e
    }
    expect(error.message).to.include('Not a finite number value')
  })

  it("[NaN,1] should throw", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    let error
    try {
      await render(() => [NaN,1], context)
    } catch (e) {
      error = e
    }
    expect(error.message).to.include('Not a finite number value')
  })

  it("Infinity should throw", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    let error
    try {
      await render(() => Infinity, context)
    } catch (e) {
      error = e
    }
    expect(error.message).to.include('Not a finite number value')
  })

  it("[Infinity,1] should throw", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    let error
    try {
      await render(() => [Infinity,1], context)
    } catch (e) {
      error = e
    }
    expect(error.message).to.include('Not a finite number value')
  })

  it("[1,undefined] should throw", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    let error
    try {
      await render(() => [1,undefined], context)
    } catch (e) {
      error = e
    }
    expect(error.message).to.include('Not a finite number value')
  })

  it("mono fn to mono buffer (as-is)", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    await render(({ n }) => n, context)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  })

  it("stereo fn to mono buffer (add then half)", async () => {
    const context = { n: 0, buffer: [new Float32Array(4)], tick () { this.n++ } }
    await render(({ n }) => [n,1], context)
    expect(context.buffer[0]).to.be.buffer([.5,1,1.5,2])
  })

  it("mono fn to stereo buffer (half then copy)", async () => {
    const context = { n: 0, buffer: [new Float32Array(4), new Float32Array(4)], tick () { this.n++ } }
    await render(({ n }) => n, context)
    expect(context.buffer[0]).to.be.buffer([0,.5,1,1.5])
    expect(context.buffer[1]).to.be.buffer([0,.5,1,1.5])
  })

  it("stereo fn to stereo buffer (as-is)", async () => {
    const context = { n: 0, buffer: [new Float32Array(4), new Float32Array(4)], tick () { this.n++ } }
    await render(({ n }) => [n,1], context)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    expect(context.buffer[1]).to.be.buffer([1,1,1,1])
  })
})
