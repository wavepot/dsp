import SafeDynamicWorker from './safe-dynamic-worker.js'
import randomId from '../lib/random-id.js'

let callbackId = 0
const callbacks = self.callbacks ?? new Map
const isMain = typeof window !== 'undefined'
if (!isMain) self.callbacks = callbacks

export const rpcs = new Map

const rpc = (url, method, args = []) => getRpc(url).rpc(method, args)
rpc.get = url => getRpc(url)
rpc.update = url => getRpc(url).worker.updateInstance()
rpc.markAsSafe = url => getRpc(url).worker.markAsSafe()
rpc.clear = () => rpcs.clear()
rpc.clearHanging = error => { [...callbacks.values()].forEach(fn => fn.reject(error)), callbacks.clear() }
rpc.clearAll = () => (rpc.clear(), rpc.clearHanging())

export default rpc

class Rpc {
  constructor (url) {
    this.url = url
    this.worker = new SafeDynamicWorker(url)
    this.worker.onmessage = ({ data }) => {
      if (!data.call) return
      if (!(data.call in this)) {
        throw new ReferenceError('Rpc receive method not found: ' + data.call)
      }
      this[data.call](data)
    }
    this.worker.onmessageerror = error => rpc.onmessageerror?.(error, url)
    this.worker.onerror = error => rpc.onerror?.(error, url)
    this.worker.onfail = fail => rpc.onfail?.(fail, url)
  }

  async proxyRpc ({ url, callbackId, method, args }) {
    try {
      const result = await rpc(url, method, args)
      this.worker.postMessage({
        call: 'onreply',
        replyTo: callbackId,
        result
      })
    } catch (error) {
      this.worker.postMessage({
        call: 'onreply',
        replyTo: callbackId,
        error
      })
    }
  }

  rpc (method, args) {
    const cid = ++callbackId

    const promise = Promise.race([
      new Promise((_, reject) => setTimeout(reject, 5000, new Error('rpc: Timed out.'))),
      new Promise((resolve, reject) =>
        callbacks.set(cid, { resolve, reject }))
    ])

    this.worker.postMessage({
      call: method,
      callbackId,
      args
    })

    return promise
  }

  onerror ({ error }) {
    this.worker.dispatch('onerror', error)
    rpc.clearHanging(error)
  }

  onreply ({ replyTo, error, result }) {
    const callback = callbacks.get(replyTo)
    if (callback) {
      callbacks.delete(replyTo)
      if (error) {
        callback.reject(error)
      } else {
        callback.resolve(result)
      }
    }
  }
}

class RpcProxy {
  constructor (url) {
    this.url = url
  }

  rpc (method, args) {
    const cid = ++callbackId

    const promise = Promise.race([
      new Promise((_, reject) => setTimeout(reject, 5000, new Error('rpc: Timed out.'))),
      new Promise((resolve, reject) =>
        callbacks.set(cid, { resolve, reject }))
    ])

    postMessage({
      call: 'proxyRpc',
      url: this.url,
      callbackId: cid,
      method,
      args
    })

    return promise
  }
}

const getRpc = url => {
  url = new URL(url, location.href).href
  if (isMain) {
    if (!rpcs.has(url)) rpcs.set(url, new Rpc(url))
    return rpcs.get(url)
  } else {
    return new RpcProxy(url)
  }
}