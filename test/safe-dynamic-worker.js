import DynamicCache from '../dynamic-cache.js'
import SafeDynamicWorker from '../src/safe-dynamic-worker.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = new DynamicCache()
})

describe("new SafeDynamicWorker(url)", () => {
  it("creates a SafeDynamicWorker", async () => {
    const url = await cache.put('simple.js', 'postMessage("foo")')
    const worker = new SafeDynamicWorker(url)
    const result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal('foo')
  })

  it("updates worker", async () => {
    let url, worker, result
    url = await cache.put('simple.js', 'postMessage("foo")')
    worker = new SafeDynamicWorker(url)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal('foo')

    url = await cache.put('simple.js', 'postMessage("bar")')
    worker = new SafeDynamicWorker(url)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data).to.equal('bar')
  })

  it("send and receive", async () => {
    let url, worker, result
    url = await cache.put('send-receive.js', `
onmessage = ({ data }) => {
  postMessage({ ack: data.ackId })
  postMessage({ foo: data.message.foo })
}
`)
    worker = new SafeDynamicWorker(url)
    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(1)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.foo).to.equal('foobar')
  })

  it("send and receive heal fail", async () => {
    let url, worker, result
    url = await cache.put('send-receive-keep-alive.js', `
let i = 0
onmessage = ({ data }) => {
  postMessage({ ack: data.ackId })
  postMessage({ i: ++i })
}
`)
    worker = new SafeDynamicWorker(url)
    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(1)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(1)

    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(2)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(2)

    url = await cache.put('send-receive-keep-alive.js', 'error')
    worker.updateInstance()
    result = await new Promise(resolve => worker.onfail = resolve)
    expect(result.message).to.include('heal')
  })

  it("send and receive heal success", async () => {
    let url, worker, result
    url = await cache.put('send-receive-keep-alive.js', `
let i = 0
onmessage = ({ data }) => {
  postMessage({ ack: data.ackId })
  postMessage({ i: ++i })
}
`)
    worker = new SafeDynamicWorker(url)
    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(1)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(1)

    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(2)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(2)

    url = await cache.put('send-receive-keep-alive.js', 'error')
    worker.markAsSafe()
    worker.updateInstance()

    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(3)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(3)
  })

  it("send and receive heal fail then update success and retry message", async () => {
    let url, worker, result
    url = await cache.put('send-receive-keep-alive.js', `
let i = 0
onmessage = ({ data }) => {
  postMessage({ ack: data.ackId })
  postMessage({ i: ++i })
}
`)
    worker = new SafeDynamicWorker(url)
    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(1)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(1)

    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(2)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(2)

    url = await cache.put('send-receive-keep-alive.js', 'error')
    worker.updateInstance()
    worker.postMessage({ foo: 'foobar' })
    result = await new Promise(resolve => worker.onfail = resolve)
    expect(result.message).to.include('heal')

    url = await cache.put('send-receive-keep-alive.js', `
let i = 0
onmessage = ({ data }) => {
  postMessage({ ack: data.ackId })
  postMessage({ i: ++i })
}
`)
    worker.updateInstance()
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.ack).to.equal(3)
    result = await new Promise(resolve => worker.onmessage = resolve)
    expect(result.data.i).to.equal(1)
  })

})
