import './setup.js'
import { workerMix, Shared32Array } from '../../src/dsp.js'
import DynamicCache from '../dynamic-cache.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = new DynamicCache('test', { 'Content-Type': 'application/javascript' })
})

// describe("workerMix() normal", () => {
//   it("should render a normal dsp", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/counter.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([0,1,2,3])
//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([4,5,6,7])
//   })

//   it("should reuse loader", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/counter.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([8,9,10,11])
//   })
// })

// describe("workerMix() nested", () => {
//   it("should render a nested dsp", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/nested.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([3,3,3,3])
//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([3,3,3,3])
//   })
// })

// describe("workerMix() nested worker", () => {
//   it("should render a nested worker dsp", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer, cache, sampleRate: 4 }
//     const render = workerMix('/test/fixtures/nested-worker.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(buffer[0]).to.be.buffer([0,-1,0,1])
//     expect(context.n).to.equal(8)
//   })
// })

describe("workerMix() nested worker that updates inner", () => {
  it("should render a nested worker dsp", async () => {
    const buffer = [new Shared32Array(4)]
    const context = { buffer, cache, sampleRate: 4, autoRender: true }

    const file_a = await cache.put('ncount', 'export default ({ n }) => n')
    const file_b = await cache.put('ncountwrap', `
export default async (c) => {
  c.nBuffer = c.nBuffer ?? [new c.Buffer(c.bufferSize)]
  const render = c.workerMix('ncount')
  render({ buffer: c.nBuffer })
  return ({ p }) => c.nBuffer[0][p]
}
    `)

    let count = 2
    let done
    let next = async () => {
      if (--count) return

      expect(context.n).to.equal(8)
      expect(buffer[0]).to.be.buffer([0,1,2,3])

      count = 1
      next = async () => {
        if (--count) return

        expect(context.n).to.equal(12)
        expect(buffer[0]).to.be.buffer([0,1,2,3])
        done()
      }
      render.onrender = next
      await cache.put('ncount', 'export default ({ n }) => n')
    }

    const render = workerMix(file_b)
    render.onrender = next
    render(context)

    return new Promise(resolve => done = resolve)
  })
})

// describe("workerMix() adder", () => {
//   it("should accept buffer as input and use it", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/adder.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])
//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([2,2,2,2])
//   })
// })

// describe("workerMix() async setup", () => {
//   it("should render a dsp with async setup", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/async-setup.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([0,1,2,3])
//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([4,5,6,7])
//   })
// })

// describe("workerMix() runtime error in dsp", () => {
//   it("should catch error", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/runtime-error-dsp.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     const error = await new Promise(resolve => render.onerror = resolve)
//     expect(error.stack).to.contain('runtime-error-dsp.js')
//     expect(error.message).to.contain('not a function')
//   })
// })

// describe("workerMix() runtime error in setup", () => {
//   it("should catch error", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/runtime-error-setup.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     const error = await new Promise(resolve => render.onerror = resolve)
//     expect(error.stack).to.contain('runtime-error-setup.js')
//     expect(error.message).to.contain('not a function')
//   })
// })

// describe("workerMix() fail to load module error", () => {
//   it("should catch error", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('fail fail fail')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     const error = await new Promise(resolve => render.onerror = resolve)
//     expect(error.stack).to.contain('Failed to fetch')
//     expect(error.stack).to.contain('fail%20fail%20fail')
//   })
// })

// describe("workerMix() syntax error", () => {
//   it("should catch error", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const render = workerMix('/test/fixtures/syntax-error.js')

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     const error = await new Promise(resolve => render.onerror = resolve)
//     expect(error.stack).to.contain('SyntaxError')
//     expect(error.message).to.contain('Unexpected identifier')
//     // unfortunately exact error line is only visible
//     // in chrome devtools, but is not contained in the
//     // error object for some unknown reason..
//   })
// })

// describe("workerMix() dynamic cache replace", () => {
//   it("should render cached dsp", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer, cache }
//     const filename = await cache.put('simple', 'export default () => 1')
//     const render = workerMix(filename)

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])
//     await cache.put('simple', 'export default () => 2')
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([2,2,2,2])
//   })

//   it("when syntax errored, keep rendering previous", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const filename = await cache.put('syntax', 'export default ({ input }) => input + 1')
//     const render = workerMix(filename)

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     await cache.put('syntax', 'syntax error')
//     await new Promise(resolve => render.onerror = resolve)
//     render.onerror = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([2,2,2,2])
//   })

//   it("when runtime errored, keep rendering previous", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const filename = await cache.put('runtime', 'export default ({ input }) => input + 1')
//     const render = workerMix(filename)

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     await cache.put('runtime', 'export default ({ n }) => n()')
//     await new Promise(resolve => render.onerror = resolve)
//     render.onerror = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([2,2,2,2])
//   })

//   it("when runtime errored but error resolves, replace", async () => {
//     const buffer = [new Shared32Array(4)]
//     const context = { buffer }
//     const filename = await cache.put('runtimeresolve', 'export default ({ input }) => input + 1')
//     const render = workerMix(filename)

//     render(context)
//     expect(buffer[0]).to.be.buffer([0,0,0,0])
//     await new Promise(resolve => render.onrender = resolve)
//     render.onrender = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     await cache.put('runtimeresolve', 'export default ({ n }) => n()')
//     await new Promise(resolve => render.onerror = resolve)
//     render.onerror = null
//     expect(context.n).to.equal(4)
//     expect(buffer[0]).to.be.buffer([1,1,1,1])

//     render(context)
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(8)
//     expect(buffer[0]).to.be.buffer([2,2,2,2])

//     await cache.put('runtimeresolve', 'export default ({ n }) => n')
//     await new Promise(resolve => render.onrender = resolve)
//     expect(context.n).to.equal(12)
//     expect(buffer[0]).to.be.buffer([8,9,10,11])
//   })
// })
