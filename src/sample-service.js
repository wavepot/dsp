import install from './rpc-worker-include.js'
import Shared32Array from '../lib/shared-array-buffer.js'

export default audio => {
  const samples = new Map

  const SampleService = {
    methods: {
      fetchSample: async url => {
        url = new URL(url, location.href).href

        let sample = samples.get(url)

        if (!sample) {
          const res = await fetch(url)
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await audio.decodeAudioData(arrayBuffer)
          const floats = Array(audioBuffer.numberOfChannels).fill(0).map((_, i) =>
            audioBuffer.getChannelData(i))
          sample = floats.map(buf => {
            const shared = new Shared32Array(buf.length)
            shared.set(buf)
            return shared
          })
          samples.set(url, sample)
        }

        return sample
      },
    },
    postMessage (data) {
      SampleService.worker.onmessage({ data })
    },
    worker: {
      postMessage (data) {
        SampleService.onmessage({ data: { ackId: -999999, message: data } })
      }
    }
  }

  install(SampleService)
  window['main:sample-service'] = SampleService
  console.log('sample service running')
}
