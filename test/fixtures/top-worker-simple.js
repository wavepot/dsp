let i = 0

const worker = {
  inc () {
    postMessage(++i)
  },
  foo () {
    postMessage('bar')
  }
}

onmessage = ({ data }) => worker[data.call](data)

postMessage({ call: 'onready' })
