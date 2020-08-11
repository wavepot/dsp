export default (target, source) => {
  // console.log('mixing', source[0].length, '>', target[0].length)
  const tl = target[0].length
  const sl = source[0].length
  if (target.length === 2) {
    if (source.length === 2) { // stereo to stereo
      for (let x = 0; x < tl; x++) {
        target[0][x%tl] += source[0][x%sl]
        target[1][x%tl] += source[1][x%sl]
      }
    } else if (source.length === 1) { // mono to stereo
      for (let x = 0; x < tl; x++) {
        target[0][x%tl] += source[0][x%sl]/2
        target[1][x%tl] += source[0][x%sl]/2
      }
    }
  } else if (target.length === 1) {
    if (source.length === 2) { // stereo to mono
      for (let x = 0; x < tl; x++) {
        target[0][x%tl] += (source[0][x%sl] + source[1][x%sl])/2
      }
    } else if (source.length === 1) { // mono to mono
      for (let x = 0; x < tl; x++) {
        target[0][x%tl] += source[0][x%sl]
      }
    }
  }
  return target
}
