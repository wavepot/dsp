import Hyper from './hyper.js'
import render from './render.js'
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
  for (let i = args.length; i >= 1; i--) {
    for (let j = i-1; j >= 0; j--) {
      Object.assign(args[j], args[i])
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
