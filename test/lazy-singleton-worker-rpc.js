import DynamicCache from '../dynamic-cache.js'
import rpc, { rpcs } from '../src/lazy-singleton-worker-rpc.js'

let cache

before(async () => {
  await DynamicCache.install()
  cache = new DynamicCache()
})

afterEach(() => {
  rpc.clearAll()
})

describe("await rpc(url, method, args)", () => {
  it("should lazy load url and call methods", async () => {
    let url, result

    url = await cache.put('simple.js', `
import '/src/rpc-worker-include.js'
let i = 0
self.methods = {
  inc: () => ++i,
  mul: (a, b) => a * b
}
`)
    result = await rpc(url, 'mul', [2,5])
    expect(result).to.equal(10)

    result = await rpc(url, 'inc')
    expect(result).to.equal(1)

    result = await rpc(url, 'inc')
    expect(result).to.equal(2)
  })
})

describe("await rpc(url, method, args) inside worker", () => {
  it("should proxy methods", async () => {
    let url_simple, url_other, result

    url_simple = await cache.put('simple.js', `
import '/src/rpc-worker-include.js'
let i = 0
self.methods = {
  inc: () => ++i,
  mul: (a, b) => a * b,
  other: (x) => self.rpc('./other.js', 'otherFoo', [x])
}
`)

    url_other = await cache.put('other.js', `
import '/src/rpc-worker-include.js'
self.methods = {
  otherInc: () => self.rpc('./simple.js', 'inc'),
  otherMul: (a) => self.rpc('./simple.js', 'mul', [a,2]),
  otherFoo: (x) => 'foo' + x
}
`)
    result = await rpc(url_simple, 'mul', [2,5])
    expect(result).to.equal(10)

    result = await rpc(url_simple, 'inc')
    expect(result).to.equal(1)

    result = await rpc(url_other, 'otherInc')
    expect(result).to.equal(2)

    result = await rpc(url_other, 'otherMul', [3])
    expect(result).to.equal(6)

    result = await rpc(url_simple, 'other', ['bar'])
    expect(result).to.equal('foobar')

    expect([...rpcs.keys()].length).to.equal(2)
    expect([...rpcs.keys()]).to.deep.equal([
      url_simple,
      url_other
    ])
  })
})

describe("await rpc(url, method, args) inside worker, recover from error", () => {
  it("should proxy methods and recover without losing data", async () => {
    let url_simple, url_other, result

    url_simple = await cache.put('simple.js', `
import '/src/rpc-worker-include.js'
let i = 0
self.methods = {
  inc: () => ++i,
  mul: (a, b) => a * b,
  other: (x) => self.rpc('./other.js', 'otherFoo', [x])
}
`)

    url_other = await cache.put('other.js', `
import '/src/rpc-worker-include.js'
self.methods = {
  otherInc: () => self.rpc('./simple.js', 'inc'),
  otherMul: (a) => self.rpc('./simple.js', 'mul', [a,2]),
  otherFoo: (x) => 'foo' + x
}
`)
    result = await rpc(url_simple, 'mul', [2,5])
    expect(result).to.equal(10)

    result = await rpc(url_simple, 'inc')
    expect(result).to.equal(1)

    rpc.markAsSafe(url_simple)

    result = await rpc(url_other, 'otherInc')
    expect(result).to.equal(2)

    result = await rpc(url_other, 'otherMul', [3])
    expect(result).to.equal(6)

    await cache.put('simple.js', 'onmessage = () => error')
    const errors = []
    rpc.onerror = err => errors.push(err)
    rpc.update(url_simple)

    result = await rpc(url_simple, 'other', ['bar'])
    expect(result).to.equal('foobar')

    expect(errors.length).to.equal(1)
    expect(errors[0].message).to.include('error is not defined')

    result = await rpc(url_simple, 'inc')
    expect(result).to.equal(3)

    expect([...rpcs.keys()].length).to.equal(2)
    expect([...rpcs.keys()]).to.deep.equal([
      url_simple,
      url_other
    ])
  })
})
