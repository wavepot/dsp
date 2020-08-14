import Hyper from './hyper.js'
import render from './render.js'
import Context from './context.js'
import mixBuffers from './mix-buffers.js'

export default context => {
  return Hyper({
    context: new Context(context),
    execute: render,
    mergeSide,
    mergeUp,
  })
}

const mergeUp = (...a) => {
  let ub, db
  for (let u = a.length-1; u >= 1; u--) {
    for (let d = u-1; d >= 0; d--) {
      ub = a[u].buffer
      db = a[d].buffer
      if (ub !== db) {
        mixBuffers(db, ub)
      }
    }
  }
  return a[0]
}

const mergeSide = (...a) => {
  a = a.filter(x => typeof x !== 'string')
  for (let r = a.length-1; r >= 1; r--) {
    let l = r-1
    for (let key in a[r]) {
      // sibling iteration shouldn't copy `frame`
      // i.e it should begin at the parent's
      //     position
      // if (key === 'n' || key === 'p') continue

      a[l][key] = a[r][key]
    }
  }
  return a[0]
}
