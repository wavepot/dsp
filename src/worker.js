// import { serializeError } from '../lib/error.js'
import Mix from './mix.js'

console.log('worker started')

const worker = {
  async setup ({ context }) {
    console.log('worker: `setup()`', context)

    if (this.hasSetup) {
      console.error('worker: `setup()` called twice.', this.url)
      return
    }

    this.url = context.url

    try {
      this.fn = (await import(this.url)).default
    } catch (error) {
      return postMessage({ call: 'onerror', error })
        // call: 'onerror',
        // error: serializeError(error)
      // })
    }

    this.hasSetup = true

    this.render({ context })
  },
  async render ({ context }) {
    console.log('worker: `render()`', context)

    if (!this.fn) {
      console.error('worker: `render()` called but function not ready:', this.url)
      return
    }

    if (!this.output) {
      this.output = context.buffer
      this.buffer = this.buffer ?? this.output.map(b => new Float32Array(b.length))
    }

    delete context.buffer
    context.buffer = this.buffer

    this.mix = this.mix ?? Mix(context)
    try {
      await this.mix(this.fn, context)
      // NOTE: there is going to be a rare(?) case where
      // the shared buffer here is written out while it's being read
      // on the other side and may cause glitches.
      // But it's very unlikely since this method is being invoked
      // at the same time when the read&copy on the other side begins,
      // so our mix here has to be faster than that for the glitch
      // to happen. (?) Make sure we don't delay the copy
      // on the other side because that will glitch for sure.
      this.buffer.forEach((b, i) => this.output[i].set(b))
      console.log('worker: written buffer out', this.url)
      postMessage({ call: 'onsuccess' })
    } catch (error) {
      return postMessage({ call: 'onerror', error })
        // call: 'onerror',
        // error: serializeError(error)
      // })
    }
  }
}

onmessage = ({ data }) => worker[data.call](data)

onunhandledrejection = error => {
  postMessage({ call: 'onerror', error: error.reason })
    // error: serializeError(error.reason)
  // })
}
