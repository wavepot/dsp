export default async c => {
  const [
    miss,
    drums,
    piano,
  ] = await Promise.all([
    c.buf({id:'miss',len:c.br,ch:1}),
    c.buf({id:'drums',len:c.br*2,ch:1}),
    c.buf({id:'piano',len:c.br*2,ch:1}),
  ])

  const texture = await c.sample('freesound:263671')
  const fridge = await c.sample('freesound:478656')
  const bass = await c.sample('freesound:144114')

  const missSrc = await c.src(
    './miss-judged.js',{buffer:miss,d:16,s:32})

  if (drums.createdNow)
    await c.src('./drums.js',{buffer:drums})

  if (piano.createdNow)
    await c.src('./piano.js',{buffer:piano,hz:200,chord:[2/4,7/6]})

  return c => c(
    c => { c.mix(c.zero(c.buffer),
      [miss, 1,1.3,c.n],
      [drums,1,1.3,c.n],
      [piano,1,1.5,c.n+c.br],
      [texture,1,.15,c.n],
      [fridge,1,1,c.n],
      [bass,1,7,c.n],
    ) },
    c => { missSrc.update(c) },

    // limiter
    c => [
      Math.tanh(c.input[0])*.8,
      Math.tanh(c.input[1])*.8
    ]
  )
}