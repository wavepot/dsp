import mixWorker, { workers, starting } from '../src/mix-worker-service.js'

const fixtures = {
  simple: import.meta.url
    .replace('mix-worker-service.js', 'fixtures/mix-worker-simple.js'),
  complex: import.meta.url
    .replace('mix-worker-service.js', 'fixtures/mix-worker-complex.js'),
}

afterEach(() => {
  // workers.clear()
  // starting.clear()
})

describe("mixWorker(url, context)", () => {
  it("handle runtime error", async () => {
    const context = { id: 'foo', toJSON: () => ({ id: 'foo', fn: 'foo' }) }

    let error
    try {
      await mixWorker(fixtures.simple, context)
    } catch (err) {
      error = err
    }

    expect(error.message).to.include('not a function')
  })

  it("success", async () => {
    const context = { id: 'foo', toJSON: () => ({ id: 'foo', fn: 'inc' }) }

    let result

    result = await mixWorker(fixtures.simple, context)
    expect(result.i).to.equal(1)

    result = await mixWorker(fixtures.simple, context)
    expect(result.i).to.equal(2)
  })

  // it("handle runtime error", async () => {
  //   const context = { toJSON: () => ({ call: 'foo' }) }

  //   const result = await mixWorker(fixtures.simple, context)

  //   expect(result).to.equal('bar')
  // })
})

// describe("getWorker(url) inside Worker", () => {
//   it("should be able to proxy message", async () => {
//     const worker = getWorker(fixtures.complex)
//     worker.postMessage({ call: 'other' })
//     await new Promise(resolve => worker.onmessage = resolve)
//     await new Promise(resolve => worker.onmessage = resolve)
//     expect(starting.has(fixtures.simple)).to.equal(true)
//   })
// })

// describe("getWorker(url) should return same worker", () => {
//   it("should call the same worker", async () => {
//     let worker = getWorker(fixtures.simple)
//     await new Promise(resolve => worker.onmessage = resolve)
//     worker.postMessage({ call: 'inc' })
//     let result = await new Promise(resolve => worker.onmessage = resolve)
//     expect(result.data).to.equal(1)

//     worker = getWorker(fixtures.simple)
//     worker.postMessage({ call: 'inc' })
//     result = await new Promise(resolve => worker.onmessage = resolve)
//     expect(result.data).to.equal(2)
//   })
// })

// describe("getWorker(url) inside worker should return same worker", () => {
//   it("should proxy to the same worker", async () => {
//     let worker = getWorker(fixtures.simple)
//     await new Promise(resolve => worker.onmessage = resolve)
//     worker.postMessage({ call: 'inc' })
//     let result = await new Promise(resolve => worker.onmessage = resolve)
//     expect(result.data).to.equal(1)

//     worker = getWorker(fixtures.complex)
//     await new Promise(resolve => worker.onmessage = resolve)
//     worker.postMessage({ call: 'incOther' })
//     await new Promise(resolve => setTimeout(resolve, 10))

//     worker = getWorker(fixtures.simple)
//     worker.postMessage({ call: 'inc' })
//     result = await new Promise(resolve => worker.onmessage = resolve)
//     expect(result.data).to.equal(3)
//   })
// })
