import getWorker from '/src/top-worker.js'

const worker = {
  incOther () {
    const url = '/test/fixtures/top-worker-simple.js'
    const worker = getWorker(url)
    worker.postMessage({ call: 'inc' })
  },
  other () {
    const url = '/test/fixtures/top-worker-simple.js'
    const worker = getWorker(url)
    worker.postMessage({ call: 'foo' })
  }
}

onmessage = ({ data }) => worker[data.call](data)

postMessage({ call: 'onready' })
