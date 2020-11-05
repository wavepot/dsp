import impulseConvolve from './impulse-convolve-stereo.js'

export default async (c, { url, offset = 0, length = -1, id = '' }=c) => {
  const reverb = await impulseConvolve(c, url, length)
  let tail = 0
  let prev = (await c.get('impulse-reverb-stereo:prev:'+id+url+(c.n-c.buffer[0].length)))
    ||[new Float32Array(),new Float32Array()]
  let curr
  let len = 0
  let i = 0
  return c => {
    len = c.buffer[0].length
    curr = [
      reverb[0](c.buffer[0]),
      reverb[1](c.buffer[1])
    ]
    // add remaining tail from previous step
    for (i = 0; i < prev[0].length; i++) {
      curr[0][i] += prev[0][i]
      curr[1][i] += prev[1][i]
    }
    tail = (curr[0].length - offset) - len
    prev[0] = curr[0].subarray(-tail)
    prev[1] = curr[1].subarray(-tail)
    c.set('impulse-reverb-stereo:prev:'+id+url+c.n, prev, 5000)
    return [
      curr[0].subarray(offset, offset + len),
      curr[1].subarray(offset, offset + len),
    ]
  }
}