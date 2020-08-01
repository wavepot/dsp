import { serializeError } from '../lib/error.js'
import { Context, mix } from './dsp.js'

const worker = {
  async setup ({ context }) {
    context = Context(context)
    try {
      this.fn = (await import(context.url)).default
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
  async render ({ context }) {
    context = Context(context)
    const render = mix(this.fn)
    try {
      await render(context, context.params)
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
