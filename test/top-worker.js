import getWorker, { workers, starting } from '../src/top-worker.js'

const fixtures = {
  simple: import.meta.url
    .replace('top-worker.js', 'fixtures/top-worker-simple.js'),
  complex: import.meta.url
    .replace('top-worker.js', 'fixtures/top-worker-complex.js'),
}

afterEach(() => {
  workers.clear()
  starting.clear()
})

describe("getWorker(url)", () => {
  it("should return a TopWorker", async () => {
    const worker = getWorker(fixtures.simple)
    expect(worker).to.be.an('object')
    await new Promise(resolve => worker.onmessage = resolve)
    worker.postMessage({ call: 'foo' })
    const result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal('bar')
  })
})

describe("getWorker(url) inside Worker", () => {
  it("should be able to proxy message", async () => {
    const worker = getWorker(fixtures.complex)
    worker.postMessage({ call: 'other' })
    await new Promise(resolve => worker.onmessage = resolve)
    await new Promise(resolve => worker.onmessage = resolve)
    expect(starting.has(fixtures.simple)).to.equal(true)
  })
})

describe("getWorker(url) should return same worker", () => {
  it("should call the same worker", async () => {
    let worker = getWorker(fixtures.simple)
    await new Promise(resolve => worker.onmessage = resolve)
    worker.postMessage({ call: 'inc' })
    let result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal(1)

    worker = getWorker(fixtures.simple)
    worker.postMessage({ call: 'inc' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal(2)
  })
})

describe("getWorker(url) inside worker should return same worker", () => {
  it("should proxy to the same worker", async () => {
    let worker = getWorker(fixtures.simple)
    await new Promise(resolve => worker.onmessage = resolve)
    worker.postMessage({ call: 'inc' })
    let result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal(1)

    worker = getWorker(fixtures.complex)
    await new Promise(resolve => worker.onmessage = resolve)
    worker.postMessage({ call: 'incOther' })
    await new Promise(resolve => setTimeout(resolve, 10))

    worker = getWorker(fixtures.simple)
    worker.postMessage({ call: 'inc' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal(3)
  })
})
