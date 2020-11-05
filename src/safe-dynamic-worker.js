const dispatch = listeners => event =>
  listeners.forEach(fn => fn(event))

const PAUSE_TIMEOUT = 10 * 1000 // 10 secs

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

    this.pause = this.pause.bind(this)

    this.updateInstance()
  }

  dispatch (type, event) {
    dispatch(this.listeners[type])(event)
  }

  markAsSafe () {
    const prevSafe = this.safe
    this.safe = this.worker
    if (prevSafe && prevSafe !== this.safe) {
      setTimeout(() => {
        try {
          console.warn('safe: terminating previous safe worker')
          prevSafe.terminate()
        } catch (error) {
          console.error(error)
        }
      // give some time to finish operations
      // before forcefully terminating
      }, 5000)
    }
  }

  reviveSafe (err) {
    if (this.worker && this.worker.state !== 'failed') {
      this.worker.state = 'failed'
      this.unbindListeners()
      try {
        console.log('failed: terminating worker')
        this.worker.terminate()
      } catch (error) {
        console.error(error)
      }
      this.worker = null
    }
    if (this.safe && this.worker !== this.safe && this.safe.state !== 'failed') {
      this.worker = this.safe
      this.bindListeners()
      this.retryMessages()
    } else {
      // this.pendingAckMessages.splice(0)
      this.dispatch('onfail', new Error('Impossible to heal: ' + this.url))
    }
  }

  retryMessages () {
    this.pendingAckMessages.forEach(([msg, transfer]) => {
      this.worker.postMessage(msg, transfer)
    })
  }

  examineAck ({ data }) {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.pause, PAUSE_TIMEOUT)

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
        try {
          console.log('update: terminating previous worker')
          this.worker.terminate()
        } catch (error) {
          console.error(error)
        }
      }
    }
    this.worker = new Worker(this.url, { type: 'module' })
    this.bindListeners()
    this.retryMessages()

    this.paused = false
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.pause, PAUSE_TIMEOUT)
  }

  pause () {
    try {
      if (this.worker) {
        this.worker.terminate()
      }
      this.worker = null
    } catch {}

    try {
      if (this.safe) {
        this.safe.terminate()
      }
      this.safe = null
    } catch {}

    this.paused = true
    this.onpause()
    console.log('worker paused: ', this.url)
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
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.pause, PAUSE_TIMEOUT)

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
