import impulseConvolve from './impulse-convolve.js'

export default async (c, { url, offset = 0, length = -1, id = '' }=c) => {
  const reverb = await impulseConvolve(c, url, length)
  let tail = 0
  let prev = (await c.get('prev:'+id+url+(c.n-c.buffer[0].length)))||new Float32Array()
  let curr
  let len = 0
  let i = 0
  return c => {
    len = c.buffer[0].length
    curr = reverb(c.buffer[0])
    // add remaining tail from previous step
    for (i = 0; i < prev.length; i++) {
      curr[i] += prev[i]
    }
    tail = (curr.length - offset) - len
    prev = curr.subarray(-tail)
    c.set('prev:'+id+url+c.n, prev, 5000)
    return curr.subarray(offset, offset + len)
  }
}