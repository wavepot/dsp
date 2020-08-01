import toFinite from '../lib/to-finite.js'

export default async (fn, context, params) => {
  const { buffer } = context
  const numOfChannels = buffer.length

  if (numOfChannels > 2) {
    throw new RangeError('unsupported number of channels [' + numOfChannels + ']')
  }

  const result = await fn(context, params)
console.log('result of', fn.toString(), result)
  if (typeof result === 'object' && '0' in result && typeof result[0] === 'number') {
    if (numOfChannels === 1) {
      buffer[0][0] =
        toFinite(result[0])
      + toFinite(result[1])
    } else {
      buffer[0][0] = toFinite(result[0])
      buffer[1][0] = toFinite(result[1])
    }
    context.n++
    renderStereo(fn, context, params)
  } else if (typeof result === 'number') {
    context.n++
    buffer[0][0] = toFinite(result) / numOfChannels
    renderMono(fn, context, params)
    if (numOfChannels === 2) {
      buffer[1].set(buffer[0])
    }
  }
}

const renderMono = (fn, context, params) => {
  const { buffer } = context
  const { length } = buffer[0]
  const numOfChannels = buffer.length

  for (let i = 1;
    i < length; // render one length
    i++,
    context.n++ // increment sample position
  ) {
    buffer[0][i] = toFinite(fn(context, params)) / numOfChannels
  }
}

const renderStereo = (fn, context, params) => {
  const { buffer } = context
  const { length } = buffer[0]
  const numOfChannels = buffer.length

  if (numOfChannels === 1) {
    for (let i = 1,
      sample = [];
      i < length; // render one length
      i++,
      context.n++ // increment sample position
    ) {
      sample = fn(context, params)
      buffer[0][i] =
        toFinite(sample[0])
      + toFinite(sample[1])
    }
  } else {
    for (let i = 1,
      sample = [];
      i < length; // render one length
      i++,
      context.n++ // increment sample position
    ) {
      sample = fn(context, params)
      buffer[0][i] = toFinite(sample[0])
      buffer[1][i] = toFinite(sample[1])
    }
  }
}
