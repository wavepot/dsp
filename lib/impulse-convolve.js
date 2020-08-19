import convolve from './convolve.js'

export default async (c, url, length) => {
  const impulse = await c.sample(url)
  if (length > -1) {
    impulse[0] = impulse[0].subarray(0, length)
  }
  const id = 'kernel:' + url + ':' + c.buffer[0].length + ':' + length
  let kernel = await c.get(id)
  if (kernel === false) {
    console.log('processing kernel:', id)
    kernel = convolve.fftProcessKernel(c.buffer[0].length, impulse[0])
    await c.set(id, kernel)
    console.log('set kernel cache:', id)
  } else {
    console.log('got cached kernel:', id)
  }
  const reverb = convolve.fftConvolution(c.buffer[0].length, kernel, impulse[0].length)
  return reverb
}