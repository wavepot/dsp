export default (filename, context) => {
  context.loaders = context.loaders ?? {}

  let loader = context.loaders[filename]
  if (loader) return loader.sampler

  loader = {}
  loader.worker = WorkerMix(filename, context)
  loader.sampler = Sampler(loader.worker.buffer)

  return loader.sampler
}

const Sampler = buffer => {
  const fn = (t, { size = buffer[0].length }) => {
    const value = [
      buffer[0][t.n % size],
      buffer?.[1][t.n % size] ?? 0
    ]
    value.valueOf = () => (value[0] + value[1]) / buffer.length
    return value
  }

  fn.buffer = buffer

  return fn
}

const WorkerMix = (filename, c) => {
  c(context => {
    context.buffer
  })
}
