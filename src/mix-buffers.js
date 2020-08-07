export default (target, source) => {
  console.log('mixing', target, source)
  if (target.length === 2) {
    for (let x = 0; x < target[0].length; x++) {
      target[0][x] += source[0][x % source[0].length]
      target[1][x] += source[1]?.[x % source[1].length]
                   ?? source[0][x % source[0].length]
    }
  } else {
    for (let x = 0; x < target[0].length; x++) {
      target[0][x] += source[0][x % source[0].length]
                   + (source[1]?.[x % source[1].length]
                   ?? 0)
    }
  }
  return target
}
