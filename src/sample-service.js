import install from './rpc-worker-include.js'
import Shared32Array from '../lib/shared-array-buffer.js'

// hacky way to switch api urls from dev to prod
const API_URL = location.port.length === 4 ? 'http://localhost:3000' : location.origin

export default audio => {
  const samples = new Map

  const SampleService = {
    methods: {
      fetchSample: async url => {
        if (url[0] !== '/') {
          url = API_URL + '/fetch?url=' + encodeURIComponent(url)
        } else {
          url = new URL(url, location.href).href
        }

        let sample = samples.get(url)

        if (!sample) {
          const res = await fetch(url)
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await audio.decodeAudioData(arrayBuffer)
          console.log('got audiobuffer', url, audioBuffer)
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
      }
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
