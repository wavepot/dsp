import HyperFn from '../src/hyper.js'

describe("fn = HyperFn(initialContext, executorFn)", () => {
  it("should return a hyper function", () => {
    const fn = HyperFn({}, () => {})
    expect(fn).to.be.a('function')
  })
})

describe("fn(...fns)", () => {
  it("should run executor function", async () => {
    let i = 0
    const fn = HyperFn({}, () => { i++ })
    await fn(() => {})
    expect(i).to.equal(1)
  })

  it("executor function should receive a hyperfunction", async () => {
    let done
    const context = {}
    const fn = HyperFn(context, (innerFn, innerContext) => {
      expect(innerFn).to.be.a('function')
      expect(innerContext.parent).to.equal(context)
      expect(innerContext.parent).to.not.equal(innerContext)
      done()
    })
    return new Promise(resolve => {
      done = resolve
      fn(() => {})
    })
  })

  it("child hyperfunction should receive copy of context", async () => {
    let done
    const context = { foo: 'bar' }
    const fn = HyperFn(context, (innerFn, innerContext) => {
      expect(innerContext.foo).to.equal('bar')
      expect(innerContext).to.not.equal(context)
      done()
    })
    return new Promise(resolve => {
      done = resolve
      fn(() => {})
    })
  })

  it("child hyperfunction should bubble up changes in context", async () => {
    const context = { foo: 'bar' }
    const fn = HyperFn(context, async (fn, context) => await fn(context))
    await fn(innerFn => {
      expect(innerFn.foo).to.equal('bar')
      innerFn.foo = 'zoo'
    })
    expect(context.foo).to.equal('zoo')
  })

  it("but reversely not", async () => {
    let inner
    const context = { foo: 'bar' }
    const fn = HyperFn(context, async (fn, context) => await fn(context))
    await fn(innerFn => {
      inner = innerFn
      expect(innerFn.foo).to.equal('bar')
      innerFn.foo = 'zoo'
    })
    expect(context.foo).to.equal('zoo')
    context.foo = 'not'
    expect(inner.foo).to.not.equal('not')
    expect(inner.foo).to.equal('zoo')
  })

  it("should execute first order hyperfunctions in order", async () => {
    let i = 0
    const context = { ordered: [] }
    const fn = HyperFn(context, async (fn, context) => await fn(context))
    await fn(
      innerFn => innerFn.ordered.push(++i),
      innerFn => innerFn.ordered.push(++i)
    )
    expect(context.ordered).to.deep.equal([1,2])
  })

  it("should execute async closure functions once", async () => {
    let a = 0, b = 0
    let fn = HyperFn({}, async (fn, context) => await fn(context))
    const top = async fn => [
      async () => {
        a++
        return () => b++
      },
      () => b++
    ]
    await fn(top)
    expect(a).to.equal(1)
    expect(b).to.equal(2)
    await fn(top)
    expect(a).to.equal(1)
    expect(b).to.equal(4)
  })

  it("deep async closures execute once", async () => {
    let a = 0, b = 0, c = 0
    let fn = HyperFn({}, async (fn, context) => await fn(context))
    const top = async fn => [
      async () => {
        a++
        return [
          async () => {
            c++
            return () => b++
          },
          () => b++
        ]
      },
      () => b++
    ]
    await fn(top)
    expect(a).to.equal(1)
    expect(b).to.equal(3)
    expect(c).to.equal(1)
    await fn(top)
    expect(a).to.equal(1)
    expect(b).to.equal(6)
    expect(c).to.equal(1)
  })

  it("same level functions inherit a unique context instance", async () => {
    let i = 0
    const context = { x: 0 }
    const fn = HyperFn(context, async (fn, context) => await fn(context))
    await fn(
      fn => (fn.x++, i++),
      fn => (fn.x++, i++)
    )
    expect(i).to.equal(2)
    expect(context.x).to.equal(1)
  })
})
