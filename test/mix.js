import './setup.js'
import Mix from '../src/mix.js'
import DynamicCache from '../dynamic-cache.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = new DynamicCache('test', { 'Content-Type': 'application/javascript' })
})

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

  it("async fn accept additional arbitrary data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => ({ n, foo }) => n + foo
    await mix(fn, { n: 2 }, { foo: 10 })
    expect(context.buffer[0]).to.be.buffer([12,13,14,15])
  })

  it("changes to data bubble up", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => ({ n }, data) => {
      data.foo++
      return n
    }
    const data = { foo: 10 }
    await mix(fn, { n: 2 }, data)
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
    expect(data.foo).to.equal(14)
    expect(fn.foo).to.equal(14)
  })

  it("added data bubble up", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => ({ n }, data) => {
      data.foo = n
      return n
    }
    const data = {}
    await mix(fn, { n: 2 }, data)
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
    expect(data.foo).to.equal(5)
    expect(fn.foo).to.equal(5)
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

  it("mix waterfall mono to mono", async () => {
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

  it("mix waterfall mono to stereo", async () => {
    const context = { buffer: [new Float32Array(4), new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      c => c.input + 1,
      c => c.input + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([1.5,2,2.5,3])
    expect(context.buffer[1]).to.be.buffer([1.5,2,2.5,3])
  })

  it("mix waterfall stereo to stereo", async () => {
    const context = { buffer: [new Float32Array(4), new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => [c.n, c.n],
      c => [c.input[0] + 1, c.input[1] + 1],
      c => [c.input[0] + 2, c.input[1] + 2],
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
    expect(context.buffer[1]).to.be.buffer([3,4,5,6])
  })

  it("mix waterfall stereo to mono", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => [c.n, c.n],
      c => [c.input[0] + 1, c.input[1] + 1],
      c => [c.input[0] + 2, c.input[1] + 2],
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
  })

  it("mix waterfall mixed to stereo", async () => {
    const context = { buffer: [new Float32Array(4), new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      c => [c.input[0] + 1, c.input[1] + 1],
      c => c.input + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([2,2.5,3,3.5])
    expect(context.buffer[1]).to.be.buffer([2,2.5,3,3.5])
  })

  it("mix waterfall mixed to mono", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      c => [c.input[0] + 1, c.input[1] + 1],
      c => c.input + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
  })

  it("mix deep new buffer adds to parent buffer, not shallow copy", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => c.n,
      async () => c => c.input + 1,
      c => c(
        async c => {
          c.buffer = [new Float32Array(2)]
          return c => c.p
        },
        c => c.input + 1
      ),
      c => c.input + 1
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,5,5,7])
    await mix(fn, { n: 1 })
    expect(context.buffer[0]).to.be.buffer([4,6,6,8])
  })
})

describe("mix('fn.js')", function () {
  this.timeout(5000)

  it("render fn.js in a worker thread, sending buffer down", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const code = `export default ({ n }) => n`
    const url = await cache.put('ncount.js', code)
    const mix = Mix(context)
    const fn = url
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,0,0,0])
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,2,4,6])
  })

  it("render fn.js in a worker thread, alternate", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const code = `export default ({ n }) => n`
    const url = await cache.put('ncount.js', code)
    const mix = Mix(context)

    let i = 0
    const fn = async fn => [c => i, url]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,0,0,0])
    await new Promise(resolve => setTimeout(resolve, 300))
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])

    i++
    await mix(fn)
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(context.buffer[0]).to.be.buffer([1,2,3,4])
  })

  it("invalidate fn.js", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const code = `export default ({ n }) => n`
    const url = await cache.put('ncount.js', code)
    const mix = Mix(context)
    const fn = url
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,0,0,0])
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    await new Promise(resolve => setTimeout(resolve, 300))

    await cache.put('ncount.js', `export default () => 5`)
    delete mix.g.loaders[url]

    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,2,4,6])
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,7,9,11])
  })
})
