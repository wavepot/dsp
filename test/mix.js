import './setup.js'
import Shared32Array from '../lib/shared-array-buffer.js'
import Mix from '../src/mix.js'
import mixWorker from '../src/mix-worker-service.js'
import DynamicCache from '../dynamic-cache.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = window.__cache = new DynamicCache('test', { 'Content-Type': 'application/javascript' })
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

  it("write context to top", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = ({ n }) => n
    await mix(fn, { n: 2 })
    expect(mix.n).to.equal(2)
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
        c => +c.n,
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

  it("async fn create closure once, even when n updates", async () => {
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
    await mix(fn, { n: 10 })
    expect(context.buffer[0]).to.be.buffer([11,12,13,14])
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
      c => +c.n,
      c => c.x + 1,
      c => c.x + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
  })

  it("mix waterfall complex", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => +c.n,
      c => c.x + 1,
      c => c(
        c => c.x + 2,
        c => c.x + 3
      )
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([6,7,8,9])
  })

  it("mix waterfall complex async", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => +c.n,
      async () => c => c.x + 1,
      c => c(
        async () => c => c.x + 2,
        c => c.x + 3
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
      c => +c.n,
      c => c.x + 1,
      c => c.x + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([1.5,2,2.5,3])
    expect(context.buffer[1]).to.be.buffer([1.5,2,2.5,3])
  })

  it("mix waterfall stereo to stereo", async () => {
    const context = { buffer: [new Float32Array(4), new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => [+c.n, +c.n],
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
      c => [+c.n, +c.n],
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
      c => +c.n,
      c => [c.input[0] + 1, c.input[1] + 1],
      c => c.x + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([2,2.5,3,3.5])
    expect(context.buffer[1]).to.be.buffer([2,2.5,3,3.5])
  })

  it("mix waterfall mixed to mono", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => +c.n,
      c => [c.input[0] + 1, c.input[1] + 1],
      c => c.x + 2
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,4,5,6])
  })

  it("mix deep new buffer adds to parent buffer, not shallow copy", async () => {
    const context = { buffer: [new Float32Array(4)] }
    const mix = Mix(context)
    const fn = async () => [
      c => +c.n,
      async () => c => c.x + 1,
      c => c(
        async c => {
          const buffer = [new Float32Array(2)]
          return c => c(
            c => c.buffer = buffer,
            c => +c.p
          )
        },
        c => c.x + 1
      ),
      c => c.x + 1
    ]
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([3,5,5,7])
    await mix(fn, { n: 1 })
    expect(context.buffer[0]).to.be.buffer([4,6,6,8])
  })
})

describe("mix('fn.js')", function () {
  this.timeout(10000)

  // it("render fn.js in a worker thread", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }
  //   const code = `export default ({ n }) => n`
  //   const url = await cache.put('ncount.js', code)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("render fn.js in a worker thread, send buffer", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }
  //   const code = `export default ({ n, x }) => n+x`
  //   const url = await cache.put('ncount.js', code)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,2,4,6])
  // })

  // it("to update dependency, main needs to update", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }
  //   const code_a = `export default ({ n }) => n`
  //   const code_b = `import a from './a.js'; export default ({ n }) => a({ n })`
  //   const url_a = await cache.put('a.js', code_a)
  //   const url_b = await cache.put('b.js', code_b)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  //   await cache.put('a.js', `export default ({ n }) => n*10`)

  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   mixWorker.update(url_b)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  // it("async fn create closure once, even when n updates", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }
  //   const code = `let x = 0; export default async c => {
  //     x++
  //     return ({ n }) => n + x
  //   }`
  //   const url = await cache.put('closure.js', code)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([2,3,4,5]) // it runs once by "test"
  //   await mix(fn, { n: 10 })
  //   expect(context.buffer[0]).to.be.buffer([12,13,14,15])
  // })

  // /* error handling */

  // it("start with syntax error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url = await cache.put('x.js', `syntax error`)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Unexpected')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('x.js', `export default ({ n }) => n`)
  //   mixWorker.update(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start correct, then syntax error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url = await cache.put('x.js', `export default ({ n }) => n`)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('x.js', `syntax error`)
  //   mixWorker.update(url)

  //   let error
  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Unexpected')
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('x.js', `export default ({ n }) => n*10`)
  //   mixWorker.update(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  // it("start with runtime error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url = await cache.put('x.js', `export default ({ n }) => runtime`)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('runtime is not defined')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('x.js', `export default ({ n }) => n`)
  //   mixWorker.update(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start correct, then runtime error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url = await cache.put('x.js', `export default ({ n }) => n`)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('x.js', `export default ({ n }) => runtime`)
  //   mixWorker.update(url)

  //   let error
  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('runtime is not defined')
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('x.js', `export default ({ n }) => n*10`)
  //   mixWorker.update(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  // /* error handling in src dependency */

  // it("start with syntax error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `syntax error`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)

  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Unexpected')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('a.js', `export default ({ n }) => n`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start correct, then syntax error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `export default ({ n }) => n`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `syntax error`)
  //   mixWorker.update(url_a)

  //   let error
  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Unexpected')
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `export default ({ n }) => n*10`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  // it("start with runtime error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `export default ({ n }) => runtime`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)

  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('runtime is not defined')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('a.js', `export default ({ n }) => n`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start correct, then runtime error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `export default ({ n }) => n`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `export default ({ n }) => runtime`)
  //   mixWorker.update(url_a)

  //   let error
  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('runtime is not defined')
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `export default ({ n }) => n*10`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  // /* infinity/NaN errors */

  // it("start with NaN error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url = await cache.put('x.js', `export default c => NaN`)
  //   mixWorker.update(url)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url)

  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Not a finite number value: NaN')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('x.js', `export default ({ n }) => n`)
  //   mixWorker.update(url)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start with dependency NaN error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `export default ({ n }) => NaN`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)

  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Not a finite number value: NaN')
  //   expect(context.buffer[0]).to.be.buffer([0,0,0,0])

  //   await cache.put('a.js', `export default ({ n }) => n`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])
  // })

  // it("start correct, then NaN error, then correct", async () => {
  //   const context = { buffer: [new Shared32Array(4)] }

  //   const url_a = await cache.put('a.js', `export default ({ n }) => n`)
  //   const url_b = await cache.put('b.js', `export default c => c.src('./a.js')`)
  //   mixWorker.update(url_a)
  //   mixWorker.update(url_b)
  //   const mix = Mix(context)
  //   const fn = c => c.src(url_b)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `export default ({ n }) => NaN`)
  //   mixWorker.update(url_a)

  //   let error

  //   try {
  //     await mix(fn)
  //   } catch (err) { error = err }
  //   expect(error.message).to.include('Not a finite number value: NaN')
  //   expect(context.buffer[0]).to.be.buffer([0,1,2,3])

  //   await cache.put('a.js', `export default ({ n }) => n*10`)
  //   mixWorker.update(url_a)
  //   await mix(fn)
  //   expect(context.buffer[0]).to.be.buffer([0,10,20,30])
  // })

  it("propagate context into src", async () => {
    const context = { buffer: [new Shared32Array(4)] }

    const url_a = await cache.put('a.js', `export default ({ z }) => z`)
    const url_b = await cache.put('b.js', `export default c => c.src('./a.js',{z:5})`)
    mixWorker.update(url_a)
    mixWorker.update(url_b)
    const mix = Mix(context)
    const fn = c => c.src(url_b)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,5,5,5])
  })

  it("propagate context into async src", async () => {
    const context = { buffer: [new Shared32Array(4)] }

    const url_a = await cache.put('a.js', `export default async c => ({ z }) => z`)
    const url_b = await cache.put('b.js', `export default c => c.src('./a.js',{z:5})`)
    mixWorker.update(url_a)
    mixWorker.update(url_b)
    const mix = Mix(context)
    const fn = c => c.src(url_b)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,5,5,5])
  })

  it("propagate context into async src params", async () => {
    const context = { buffer: [new Shared32Array(4)] }

    const url_a = await cache.put('a.js', `export default async c => (c, { z }) => z`)
    const url_b = await cache.put('b.js', `export default c => c.src('./a.js',{z:5})`)
    mixWorker.update(url_a)
    mixWorker.update(url_b)
    const mix = Mix(context)
    const fn = c => c.src(url_b)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,5,5,5])
  })

  it("propagate async context into async src params", async () => {
    const context = { buffer: [new Shared32Array(4)] }

    const url_a = await cache.put('a.js', `export default async c => (c, { z }) => z`)
    const url_b = await cache.put('b.js', `export default async c => { await c.src('./a.js',{z:5}); return c => c.buffer }`)
    mixWorker.update(url_a)
    mixWorker.update(url_b)
    const mix = Mix(context)
    const fn = c => c.src(url_b)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,5,5,5])
  })

  it("propagate async context into async src params with defaults", async () => {
    const context = { buffer: [new Shared32Array(4)] }

    const url_a = await cache.put('a.js', `export default async c => (c, { z = 10 }) => z`)
    const url_b = await cache.put('b.js', `export default async c => { await c.src('./a.js',{z:5}); return c => c.buffer }`)
    mixWorker.update(url_a)
    mixWorker.update(url_b)
    const mix = Mix(context)
    const fn = c => c.src(url_b)
    await mix(fn)
    expect(context.buffer[0]).to.be.buffer([5,5,5,5])
  })


})
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


//   it("render multiple in threads", async () => {
//     const context = { y: 0, x: 10, buffer: [new Float32Array(4)] }

//     const a_code = `export default async c => [
//   c => c('./b.js')
// ]`
//     const b_code = `export default c => c.x + c.n`
//     const c_code = `export default c => c.y`

//     let url
//     url = await cache.put('a.js', a_code)
//     const a_url = url
//     mixWorker.update(url)
//     // starting.delete(url)
//     // workers.delete(url)

//     url = await cache.put('b.js', b_code)
//     const b_url = url
//     mixWorker.update(url)

//     url = await cache.put('c.js', c_code)
//     const c_url = url
//     mixWorker.update(url)

//     const mix = Mix(context)
//     const fn = async c => [
//       c => { c.buffer[0].fill(0) },
//       a_url
//     ]
//     await mix(fn, { n: 0 })

//     expect(context.buffer[0]).to.be.buffer([10,11,12,13])
//     // expect(context.buffer[0]).to.be.buffer([0,0,0,0])
//     // await new Promise(resolve => setTimeout(resolve, 300))

//     await mix(fn, { n: 4 })
//     expect(context.buffer[0]).to.be.buffer([14,15,16,17])
//     // await new Promise(resolve => setTimeout(resolve, 300))

//     // await mix(fn, { n: 8 })
//     // await new Promise(resolve => setTimeout(resolve, 300))

//     // await mix(fn, { n: 12 })
//     // await new Promise(resolve => setTimeout(resolve, 300))


//     // url = await cache.put('b.js', `export default c => c.x + c.n + 2`)
//     // // const b_url = url
//     // starting.delete(url)
//     // workers.delete(url)

//     // await mix(fn)
//     // await new Promise(resolve => setTimeout(resolve, 300))

//     // await mix(fn)
//     // await new Promise(resolve => setTimeout(resolve, 300))

//     // await mix(fn)
//     // expect(context.buffer[0]).to.be.buffer([12,13,14,15])
//   })
// })
