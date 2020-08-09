let i = 0

const worker = {
  inc () {
    i++
  },
  setup ({ context }) {
// console.log('SETUP CALLED')
    // postMessage({ call: 'onready' })
  },
  render ({ callbackId, context }) {
    worker[context.fn]()
    postMessage({ call: 'onrender', callbackId, i })
  }
}

onmessage = ({ data }) => {
  try {
    worker[data.call](data)
  } catch (error) {
    postMessage({ call: 'onerror', error })
  }
}

onerror = (a, b, c, d, error) =>
  postMessage({ call: 'onerror', error })

onunhandledrejection = error =>
  postMessage({ call: 'onerror', error: error.reason })

// postMessage({ call: 'onready' })
