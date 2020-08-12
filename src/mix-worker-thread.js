import './rpc-worker-include.js'
import Mix from './mix.js'
import atomic from '../lib/atomic.js'

self.hasSetup = false
self.contexts = new Map

const render = async (context) => {
  let mix = self.contexts.get(context.id)

  if (!mix
  || mix.buffer.length !== context.buffer.length
  || mix.buffer[0].length !== context.buffer[0].length) {
    mix = Mix(context, {
      buffer: context.buffer
        .map(buffer => buffer.slice()) }) //new Float32Array(buffer.length)) })

    self.contexts.set(context.id, mix)
  }

  await mix(self.fn, context, { buffer: mix.buffer })

  context.buffer
    .forEach((buffer, i) => buffer.set(mix.buffer[i]))
}

const setup = async (url, context) => {
  self.url = url

  self.fn = async c => [
    // c => { c.buffer.forEach(b => b.fill(0)) },
    (await import(self.url)).default
  ]

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
