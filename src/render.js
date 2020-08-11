import assertFinite from '../lib/assert-finite.js'

export default async (fn, context) => {
  const { buffer } = context
  const numOfChannels = buffer.length

  assertFinite(context.frame)

  if (numOfChannels > 2) {
    throw new RangeError('unsupported number of channels [' + numOfChannels + ']')
  }

  const result = await fn(context, context, context)

  if (typeof result === 'object' && '0' in result && typeof result[0] === 'number') {
    if (numOfChannels === 1) {
      buffer[0][0] = (
        assertFinite(result[0])
      + assertFinite(result[1])
      ) / 2
    } else {
      buffer[0][0] = assertFinite(result[0])
      buffer[1][0] = assertFinite(result[1])
    }
    context.tick()
    renderStereo(fn, context)
    return context
  } else if (typeof result === 'number') {
    buffer[0][0] = assertFinite(result) / numOfChannels
    context.tick()
    renderMono(fn, context)
    if (numOfChannels === 2) {
      buffer[1].set(buffer[0])
    }
    return context
  }

  return result
}

const renderMono = (fn, context) => {
  const { buffer } = context
  const { length } = buffer[0]
  const numOfChannels = buffer.length

  if (numOfChannels === 1) {
    for (let i = 1; i < length; i++, context.tick()) {
      buffer[0][i] = assertFinite(fn(context, context, context))
    }
  } else {
    for (let i = 1; i < length; i++, context.tick()) {
      buffer[0][i] = assertFinite(fn(context, context, context)) / 2
    }
  }
}

const renderStereo = (fn, context) => {
  const { buffer } = context
  const { length } = buffer[0]
  const numOfChannels = buffer.length

  let sample = []

  if (numOfChannels === 1) {
    for (let i = 1; i < length; i++, context.tick()) {
      sample = fn(context, context, context)
      buffer[0][i] = (
        assertFinite(sample[0])
      + assertFinite(sample[1])
      ) / 2
    }
  } else {
    for (let i = 1; i < length; i++, context.tick()) {
      sample = fn(context, context, context)
      buffer[0][i] = assertFinite(sample[0])
      buffer[1][i] = assertFinite(sample[1])
    }
  }
}
