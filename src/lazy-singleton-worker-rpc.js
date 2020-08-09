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
rpc.clearHanging = () => [...callbacks.values()].forEach(fn => fn())
rpc.clearAll = () => (rpc.clear(), rpc.clearHanging())

export default rpc

class Rpc {
  constructor (url) {
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
    const result = await rpc(url, method, args)
    this.worker.postMessage({
      call: 'onreply',
      replyTo: callbackId,
      result
    })
  }

  rpc (method, args) {
    const cid = ++callbackId

    const promise = new Promise(resolve =>
      callbacks.set(cid, resolve))

    this.worker.postMessage({
      call: method,
      callbackId,
      args
    })

    return promise
  }

  onerror ({ error }) {
    console.log('receive!', error)
    this.worker.dispatch('onerror', error)
  }

  onreply ({ replyTo, result }) {
    const callback = callbacks.get(replyTo)
    callbacks.delete(replyTo)
    callback(result)
  }
}

class RpcProxy {
  constructor (url) {
    this.url = url
  }

  rpc (method, args) {
    const cid = ++callbackId

    const promise = new Promise(resolve =>
      callbacks.set(cid, resolve))

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