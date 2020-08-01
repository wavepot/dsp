import { serializeError } from '../lib/error.js'
import { Context, mix } from './dsp.js'

// increment module url ?<v> for cache busting
let v = 0

const worker = {
  async setup ({ context }) {
    context = Context(context)
    try {
      let fn = (await import(context.url + '?' + (v++))).default
      if (fn.constructor.name === 'AsyncFunction') {
        fn = await fn(context, context.params)
      }
      this.fn = fn
    } catch (error) {
      return postMessage({
        call: 'onerror',
        error: serializeError(error)
      })
    }
    postMessage({
      call: 'onsetup',
      context: context.toJSON()
    })
  },
  render ({ context }) {
    context = Context(context)
    const render = mix(this.fn)
    try {
      render(context, context.params)
    } catch (error) {
      return postMessage({
        call: 'onerror',
        error: serializeError(error)
      })
    }
    postMessage({
      call: 'onrender',
      context: context.toJSON()
    })
  }
}

onmessage = ({ data }) => worker[data.call](data)

onunhandledrejection = error => {
  postMessage({
    call: 'onerror',
    error: serializeError(error.reason)
  })
}
