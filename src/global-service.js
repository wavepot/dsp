import install from './rpc-worker-include.js'

const values = new Map

const GlobalService = {
  methods: {
    get: id => {
      const value = values.get(id)
      if (!value) return false
      else return value
    },
    set: (id, value) => {
      values.set(id, value)
      return value
    }
  },
  postMessage (data) {
    GlobalService.worker.onmessage({ data })
  },
  worker: {
    postMessage (data) {
      GlobalService.onmessage({ data: { ackId: -999999, message: data } })
    }
  }
}

install(GlobalService)
window['main:global-service'] = GlobalService
console.log('global service running')
