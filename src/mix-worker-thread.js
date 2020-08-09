import './rpc-worker-include.js'
import Mix from './mix.js'
import atomic from '../lib/atomic.js'

self.buffers = self.buffers ?? {}
self.hasSetup = false
self.contexts = new Map

const BUFFER_SERVICE_URL = new URL('buffer-service.js', import.meta.url).href

const render = async (context) => {
  let mix = self.contexts.get(context.id)

  if (!mix) {
    mix = Mix(context, {
      buffer: context.buffer
        .map(buffer => new Float32Array(buffer.length)) })

    self.contexts.set(context.id, mix)
  }

  await mix(self.fn, context, { buffer: mix.buffer })

  context.buffer
    .forEach((buffer, i) => buffer.set(mix.buffer[i]))
}

const setup = async (url, context) => {
  self.url = url

  self.fn = async c => [
    c => { c.buffer.forEach(b => b.fill(0)) },
    (await import(self.url)).default
  ]

  Object.assign(
    self.buffers,
    await self.rpc(BUFFER_SERVICE_URL, 'getBuffers')
  )

  // test a render
  await render({
    ...context,
    id: 'test',
    url: self.url,
    buffer: [
      new Float32Array(4),
      new Float32Array(4)
    ]
  })

  self.hasSetup = true
}

self.methods = {
  render: atomic(async (url, context) => {
    if (!self.hasSetup) {
      await setup(url, context)
    }
    return render(context)
  })
}
