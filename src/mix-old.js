import Hyper from './hyper.js'
import render from './render.js'
import Loader from './loader.js'
import Context from './context.js'

export default context => {
  return Hyper(
    new Context(context),
    render,
    merge,
    preprocess
  )
}

const merge = (...args) => {
  args = args.filter(arg => typeof arg !== 'string')
  for (let i = args.length - 1; i >= 1; i--) {
    for (let j = i-1; j >= 0; j--) {
      let j_buffer = args[j].buffer
      let i_buffer = args[i]?.buffer
      if (j === i-1) {
        if (j_buffer && i_buffer && j_buffer !== i_buffer) {
          // console.log('copying', j_buffer, i_buffer)
          if (j_buffer.length === 2) {
            for (let x = 0; x < j_buffer[0].length; x++) {
              j_buffer[0][x] += i_buffer[0][x % i_buffer[0].length]
              j_buffer[1][x] += i_buffer[1]?.[x % i_buffer[1].length]
                             ?? i_buffer[0][x % i_buffer[0].length]
            }
          } else {
            for (let x = 0; x < j_buffer[0].length; x++) {
              j_buffer[0][x] += i_buffer[0][x % i_buffer[0].length]
                              + (i_buffer[1]?.[x % i_buffer[1].length]
                             ?? 0)
            }
          }
        }
      }
      const parent = args[i].parent
      delete args[i].parent
      delete args[i].buffer
      Object.assign(args[j], args[i])
      args[i].parent = parent
      args[i].buffer = i_buffer
    }
  }
  return args[0]
}

const preprocess = context => value => {
  if (typeof value === 'string') {
    return Loader(value, context)
  }
  return value
}
