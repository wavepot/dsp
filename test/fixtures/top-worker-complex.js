import mixWorker from '/src/mix-worker-service.js'

const worker = {
  async incOther () {
    const url = '/test/fixtures/mix-worker-simple.js'
    await mixWorker(url, { toJSON: () => ({ call: 'inc' }) })
  },
  async other () {
    const url = '/test/fixtures/mix-worker-simple.js'
    await mixWorker(url, { toJSON: () => ({ call: 'foo' }) })
  }
}

onmessage = ({ data }) => worker[data.call](data)

onunhandledrejection = error =>
  postMessage({ call: 'onerror', error: error.reason })

postMessage({ call: 'onready' })
