import './setup.js'
import Mix from '../src/mix.js'
import DynamicCache from '../dynamic-cache.js'
import { starting, workers } from '../src/mix-worker.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = window.__cache = new DynamicCache('test', { 'Content-Type': 'application/javascript' })
})

xdescribe("mix = Mix(context)", () => {
  it("returns a mix function", () => {
    const mix = Mix({})
    expect(mix).to.be.a('function')
  })
})

xdescribe("mix(fn)", () => {
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

  it("added closure data should not bubble up", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = c => c(
      c => c(
        c => c.n,
        { foo: 'bar' },
      )
    )
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    expect(context.foo).to.equal(undefined)
    expect(fn.foo).to.equal(undefined)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    expect(context.foo).to.equal(undefined)
    expect(fn.foo).to.equal(undefined)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([0,1,2,3])
    expect(context.foo).to.equal(undefined)
    expect(fn.foo).to.equal(undefined)
  })

  // it("changes to data bubble up", async () => {
  //   const context = { buffer: [new Float32Array(4)] }
  //   const mix = Mix(context)
  //   const fn = async () => ({ n }, data) => {
  //     data.foo++
  //     return n
  //   }
  //   const data = { foo: 10 }
  //   await mix(fn, { n: 2 }, data)
  //   expect(context.buffer[0]).to.be.buffer([2,3,4,5])
  //   expect(data.foo).to.equal(14)
  //   expect(fn.foo).to.equal(14)
  // })

  // it("added data bubble up", async () => {
  //   const context = { buffer: [new Float32Array(4)] }
  //   const mix = Mix(context)
  //   const fn = async () => ({ n }, data) => {
  //     data.foo = n
  //     return n
  //   }
  //   const data = {}
  //   await mix(fn, { n: 2 }, data)
  //   expect(context.buffer[0]).to.be.buffer([2,3,4,5])
  //   expect(data.foo).to.equal(5)
  //   expect(fn.foo).to.equal(5)
  // })

  it("async closure fn accept additional context data", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      ({ n }) => n
    ]
    await mix(fn, { n: 2 })
    expect(context.buffer[0]).to.be.buffer([2,3,4,5])
    await mix(fn, { n: 10 })
    expect(context.buffer[0]).to.be.buffer([10,11,12,13])
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

  // it("render fn.js in a worker thread, sending buffer down", async () => {
  //   const context = { buffer: [new Float32Array(4)] }
  //   const code = `export default ({ n }) => n`
  //   const url = await cache.put('ncount.js', code)
  //   starting.delete(url)
  //   workers.delete(url)
  //   const mix = Mix(context)
  //   const fn = url
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])
  //   await new Promise(resolve => setTimeout(resolve, 300))

  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  //   await new Promise(resolve => setTimeout(resolve, 300))

  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,2,4,6])
  // })

  // it("render fn.js in a worker thread, alternate", async () => {
  //   const context = { buffer: [new Float32Array(4)] }
  //   const code = `export default ({ n }) => n`
  //   const url = await cache.put('ncount.js', code)
  //   starting.delete(url)
  //   workers.delete(url)
  //   const mix = Mix(context)

  //   let i = 0
  //   const fn = async c => [c => i, url]
  //   await mix(fn, { n: 0 })
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])
  //   await new Promise(resolve => setTimeout(resolve, 300))
  //   await mix(fn, { n: 0 })
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   i++
  //   await mix(fn, { n: 0 })
  //   await new Promise(resolve => setTimeout(resolve, 300))
  //   expect(context.buffer[0]).to.be.buffer([1,2,3,4])
  // })

  // it("invalidate fn.js", async () => {
  //   const context = { buffer: [new Float32Array(4)] }
  //   const code = `export default ({ n }) => n`
  //   const url = await cache.put('ncount.js', code)
  //   starting.delete(url)
  //   workers.delete(url)
  //   const mix = Mix(context)
  //   const fn = url
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])
  //   await new Promise(resolve => setTimeout(resolve, 300))

  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  //   await new Promise(resolve => setTimeout(resolve, 300))

  //   await cache.put('ncount.js', `export default () => 5`)
  //   starting.delete(url)
  //   workers.delete(url)

  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,2,4,6])
  //   await new Promise(resolve => setTimeout(resolve, 300))

  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([5,7,9,11])
  // })


  it("render multiple in threads", async () => {
    const context = { y: 0, x: 10, buffer: [new Float32Array(4)] }

    const a_code = `export default async c => [
  c => c('./b.js')
]`
    const b_code = `export default c => c.x + c.n`
    const c_code = `export default c => c.y`

    let url
    url = await cache.put('a.js', a_code)
    const a_url = url
    starting.delete(url)
    workers.delete(url)

    url = await cache.put('b.js', b_code)
    const b_url = url
    starting.delete(url)
    workers.delete(url)

    url = await cache.put('c.js', c_code)
    const c_url = url
    starting.delete(url)
    workers.delete(url)

    const mix = Mix(context)
    const fn = async c => [
      c => { c.buffer[0].fill(0) },
      a_url
    ]
    await mix(fn, { n: 0 })

    expect(context.buffer[0]).to.be.buffer([0,0,0,0])
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn, { n: 4 })
    await new Promise(resolve => setTimeout(resolve, 300))

    await mix(fn, { n: 8 })
    await new Promise(resolve => setTimeout(resolve, 300))

    // await mix(fn, { n: 12 })
    // await new Promise(resolve => setTimeout(resolve, 300))

    expect(context.buffer[0]).to.be.buffer([10,11,12,13])

    // url = await cache.put('b.js', `export default c => c.x + c.n + 2`)
    // // const b_url = url
    // starting.delete(url)
    // workers.delete(url)

    // await mix(fn)
    // await new Promise(resolve => setTimeout(resolve, 300))

    // await mix(fn)
    // await new Promise(resolve => setTimeout(resolve, 300))

    // await mix(fn)
    // expect(context.buffer[0]).to.be.buffer([12,13,14,15])
  })
})
