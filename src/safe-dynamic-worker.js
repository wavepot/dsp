const dispatch = listeners => event =>
  listeners.forEach(fn => fn(event))

export default class SafeDynamicWorker {
  constructor (url) {
    this.url = url

    this.ackId = 0
    this.pendingAckMessages = []

    this.listeners = {
      onerror: [this.reviveSafe.bind(this)],
      onmessage: [this.examineAck.bind(this)],
      onmessageerror: [],
      onfail: []
    }

    this.updateInstance()
  }

  dispatch (type, event) {
    dispatch(this.listeners[type])(event)
  }

  markAsSafe () {
    this.safe = this.worker
  }

  reviveSafe (err) {
    if (this.worker && this.worker.state !== 'failed') {
      this.worker.state = 'failed'
      this.unbindListeners()
      try { this.worker.terminate() } catch {}
      this.worker = null
    }
    if (this.safe && this.worker !== this.safe && this.safe.state !== 'failed') {
      this.worker = this.safe
      this.bindListeners()
      this.retryMessages()
    } else {
      this.dispatch('onfail', new Error('Impossible to heal: ' + this.url))
    }
  }

  retryMessages () {
    this.pendingAckMessages.forEach(([msg, transfer]) => {
      this.worker.postMessage(msg, transfer)
    })
  }

  examineAck ({ data }) {
    if (data.ack) {
      this.pendingAckMessages =
      this.pendingAckMessages
        .filter(([msg]) =>
          msg.ackId !== data.ack)
    }
  }

  updateInstance () {
    if (this.worker) {
      this.unbindListeners()
      if (this.worker !== this.safe) {
        try { this.worker.terminate() } catch {}
      }
    }
    this.worker = new Worker(this.url, { type: 'module' })
    this.bindListeners()
    this.retryMessages()
  }

  bindListeners () {
    this.worker.onerror = dispatch(this.listeners.onerror)
    this.worker.onmessage = dispatch(this.listeners.onmessage)
    this.worker.onmessageerror = dispatch(this.listeners.onmessageerror)
  }

  unbindListeners () {
    this.worker.onerror =
    this.worker.onmessage =
    this.worker.onmessageerror = null
  }

  postMessage (message, transfer) {
    const payload = {
      ackId: ++this.ackId,
      message
    }
    this.pendingAckMessages.push([payload, transfer])
    if (this.worker) {
      this.worker.postMessage(payload, transfer)
    }
  }

  set onerror (fn) {
    this.listeners.onerror.push(fn)
  }

  set onmessage (fn) {
    this.listeners.onmessage.push(fn)
  }

  set onmessageerror (fn) {
    this.listeners.onmessageerror.push(fn)
  }

  set onfail (fn) {
    this.listeners.onfail.push(fn)
  }
}
