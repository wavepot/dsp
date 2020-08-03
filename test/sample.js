import toFinite from '../lib/to-finite.js'

class Sample extends Number {
  constructor (n) {
    super(n)
    this._value = n
  }

  [Symbol.toPrimitive] (hint) {
    return Math.min(1, Math.max(-1, toFinite(this._value)))
  }
}

describe("Sample(n)", () => {
  it("when n=0 returns 0", () => {
    expect(+new Sample(0)).to.equal(0)
  })

  it("when n=1 returns 1", () => {
    expect(+new Sample(1)).to.equal(1)
  })

  it("when n=-1 returns -1", () => {
    expect(+new Sample(-1)).to.equal(-1)
  })

  it("when n=2 returns 1", () => {
    expect(+new Sample(2)).to.equal(1)
  })

  it("when n=-2 returns -1", () => {
    expect(+new Sample(-2)).to.equal(-1)
  })

  it("when n=0 + NaN", () => {
    let x = new Sample(0)
    expect(x + NaN).to.equal(1)
  })
})