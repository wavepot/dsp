import { serializeError } from '../lib/error.js'
import { Context, mix } from './dsp.js'

const worker = {
  async setup ({ context }) {
    context = Context(context)
    this.fn = (await import(context.url)).default
    if (this.fn.constructor.name === 'AsyncFunction') {
      try {
        this.fn = await this.fn(context, context.params)
      } catch (error) {
        return postMessage({
          call: 'onerror',
          error: serializeError(error)
        })
      }
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
