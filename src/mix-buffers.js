export default (target, ...sources) => {
  // console.log('mixing', source[0].length, '>', target[0].length)
  const tl = target[0].length
  sources.forEach(source => {
    let sl, rl, _vol, vol
    if (Array.isArray(source[0])) { // [buffer,length,volume]
      sl = (source[0][0].length * source[1])|0
      _vol = source[2]??1
      source = source[0]
      rl = source[0].length
    } else {
      sl = rl = source[0].length
    }

    // branching early so we don't branch in the loop
    if (typeof _vol === 'function') {
      if (target.length === 2) {
        if (source.length === 2) { // stereo to stereo
          for (let x = 0; x < tl; x++) {
            vol = _vol(x)
            target[0][x%tl] += source[0][x%sl%rl]*vol
            target[1][x%tl] += source[1][x%sl%rl]*vol
          }
        } else if (source.length === 1) { // mono to stereo
          for (let x = 0; x < tl; x++) {
            vol = _vol(x)
            target[0][x%tl] += (source[0][x%sl%rl]/2)*vol
            target[1][x%tl] += (source[0][x%sl%rl]/2)*vol
          }
        }
      } else if (target.length === 1) {
        if (source.length === 2) { // stereo to mono
          for (let x = 0; x < tl; x++) {
            vol = _vol(x)
            target[0][x%tl] += ((source[0][x%sl%rl] + source[1][x%sl%rl])/2)*vol
          }
        } else if (source.length === 1) { // mono to mono
          for (let x = 0; x < tl; x++) {
            vol = _vol(x)
            target[0][x%tl] += source[0][x%sl%rl]*vol
          }
        }
      }
    } else {
      vol = _vol
      if (target.length === 2) {
        if (source.length === 2) { // stereo to stereo
          for (let x = 0; x < tl; x++) {
            target[0][x%tl] += source[0][x%sl%rl]*vol
            target[1][x%tl] += source[1][x%sl%rl]*vol
          }
        } else if (source.length === 1) { // mono to stereo
          for (let x = 0; x < tl; x++) {
            target[0][x%tl] += (source[0][x%sl%rl]/2)*vol
            target[1][x%tl] += (source[0][x%sl%rl]/2)*vol
          }
        }
      } else if (target.length === 1) {
        if (source.length === 2) { // stereo to mono
          for (let x = 0; x < tl; x++) {
            target[0][x%tl] += ((source[0][x%sl%rl] + source[1][x%sl%rl])/2)*vol
          }
        } else if (source.length === 1) { // mono to mono
          for (let x = 0; x < tl; x++) {
            target[0][x%tl] += source[0][x%sl%rl]*vol
          }
        }
      }
    }
  })
  return target
}
