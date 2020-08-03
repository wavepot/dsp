export default class Context {
  constructor (data) {
    Object.defineProperty(this, 'n', {
      value: 0,
      enumerable: false,
      writable: true
    })
    Object.defineProperty(this, 'p', {
      value: 0,
      enumerable: false,
      writable: true
    })
    Object.assign(this, data)
  }

  get input () {
    return this.buffer[0][this.p]
  }
}
