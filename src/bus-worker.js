// import { serializeError } from '../lib/error.js'
import Mix from '__MIX_PATH__'
import fn from '__DSP__'

console.log('worker started')

const receivers = {}

const worker = {
  setBuffers ({ buffers }) {
    self.__buffers = Object.assign(self.__buffers ?? {}, buffers)
    console.log('received buffers', self.__buffers)
  },
  async render ({ context }) {
    const receiver = receivers[context.id] = receivers[context.id] ?? {}
    // console.log('worker: `render()`', context)

    // if (!this.fn) {
    //   console.error('worker: `render()` called but function not ready:', this.url)
    //   return
    // }

    const output = context.buffer
    const buffer = receiver.buffer = receiver.buffer
      ?? output.map(b => new Float32Array(b.length))

    delete context.buffer
    context.buffer = buffer

    if (!receiver.mix) {
      // const bus = new BroadcastChannel('dynamic-cache:article')
      // bus.onmessage = async ({ data }) => {
      //   if (data.type === 'change') {
      //     const url = data.filename
      //     if (this.mix.g?.loaders?.[url]) {
      //       console.log('CHANGED', url)
      //       delete this.mix.g.loaders[url]
      //       this.render({ context })
      //     }
      //     // methods.onchange(data.filename)
      //   } //else if (data.type === 'update') {
      //     // methods.onupdate(data.filename)
      //   //}
      // }
      receiver.mix = Mix(context)
    }
    try {
      await receiver.mix(fn, context)
      // NOTE: there is going to be a rare(?) case where
      // the shared buffer here is written out while it's being read
      // on the other side and may cause glitches.
      // But it's very unlikely since this method is being invoked
      // at the same time when the read&copy on the other side begins,
      // so our mix here has to be faster than that for the glitch
      // to happen. (?) Make sure we don't delay the copy
      // on the other side because that will glitch for sure.
      buffer.forEach((buf, i) => output[i].set(buf))
      postMessage({ call: 'onrender' })
    } catch (error) {
      postMessage({ call: 'onerror', error, id: context.id })
        // call: 'onerror',
        // error: serializeError(error)
      // })
    }
  }
}

// renderBus.onmessage = ({ data }) => worker[data.call](data)

onmessage = ({ data }) => worker[data.call](data)

onunhandledrejection = error => {
  postMessage({ call: 'onerror', error: error.reason })
    // error: serializeError(error.reason)
  // })
}

postMessage({ call: 'onready' })
