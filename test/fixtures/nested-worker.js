export default async (c) => {
  const workerBuffer = [new c.Buffer(c.beatRate)]
  const renderWorker = c.workerMix('triangle.js')
  renderWorker({ buffer: workerBuffer })
  return mix => mix(
    ({ p }) => workerBuffer[0][p % c.beatRate]
  )
}
