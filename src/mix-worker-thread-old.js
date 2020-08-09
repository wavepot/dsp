import Mix from './mix.js'

self.buffers = {}

class MixWorkerThread {
  constructor () {
    this.contexts = new Map
  }

  setBuffers ({ buffers }) {
    Object.assign(self.buffers, buffers)
  }

  async setup ({ url, context }) {
    this.url = url

    try {
      this.fn = async c => [
        c => { c.buffer.forEach(b => b.fill(0)) },
        (await import(this.url)).default
      ]

      // test a render
      await this.render({ context: {
        ...context,
        id: 'test',
        url: this.url,
        buffer: [
          new Float32Array(4),
          new Float32Array(4)
        ]
      }})

      postMessage({ call: 'onready' })
    } catch (error) {
      postMessage({ call: 'onerror', error })
    }
  }

  async render ({ callbackId, context }) {
    let mix = this.contexts.get(context.id)

    const outputBuffer = context.buffer

    let workerBuffer
    if (!mix) {
      workerBuffer = context.buffer.map(buffer =>
        new Float32Array(buffer.length))

      context.buffer = workerBuffer

      mix = Mix(context)

      this.contexts.set(context.id, mix)
    } else {
      workerBuffer = mix.buffer
    }

    context.buffer = workerBuffer

    await mix(this.fn, context)

    outputBuffer.forEach((buffer, i) =>
      buffer.set(workerBuffer[i]))

    postMessage({ call: 'onrender', callbackId })
  }
}

const mixWorkerThread = new MixWorkerThread()

onmessage = ({ data }) => {
  try {
    mixWorkerThread[data?.call]?.(data)
  } catch (error) {
    postMessage({ call: 'onerror', error })
  }
}

onerror = (a, b, c, d, error) =>
  postMessage({ call: 'onerror', error })

onunhandledrejection = error =>
  postMessage({ call: 'onerror', error: error.reason })

// onmessage = ({ data }) => mixWorkerThread[data?.call]?.(data)

// onunhandledrejection = error =>
//   postMessage({ call: 'onerror', error: error.reason })
