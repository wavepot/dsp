import install from './rpc-worker-include.js'

const values = new Map
const ttlMap = new Map

const GlobalService = {
  methods: {
    get: id => {
      const value = values.get(id)
      if (!value) return false
      else return value
    },
    set: (id, value, ttl) => {
      values.set(id, value)
      if (ttl) ttlMap.set(id, [performance.now(), ttl])
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

setInterval(() => {
  const now = performance.now()
  for (const [id, [time, ttl]] of ttlMap.entries()) {
    if (now > time + ttl) {
      ttlMap.delete(id)
      values.delete(id)
      console.warn('gs gc:', id, ttl, [values.size])
    }
  }
  if (values.size > 10) {
    console.warn('gs: too many values:', values.size)
  }
}, 1000)

install(GlobalService)
window['main:global-service'] = GlobalService
console.log('global service running')
