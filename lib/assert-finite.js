export default n => {
  if (Number.isFinite(n)) return n
  else throw new TypeError(`Not a finite number value: ${n}`)
}
