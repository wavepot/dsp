export default (innerFn, { recentOnly = false, timeout = 5000 } = {}) => {
  let queue = []

  let lock = false

  const atomicWrapperFn = async (...args) => {
    if (lock) {
      return new Promise((resolve, reject) =>
        queue.push([resolve, reject, args]))
    }
    lock = true
    let result
    try {
      if (timeout) {
        result = await Promise.race([
          new Promise((resolve, reject) => setTimeout(reject, timeout, new Error('atomic: Timed out.'))),
          innerFn(...args)
        ])
      } else {
        result = await innerFn(...args)
      }
    } catch (error) {
      // lock = false
      result = error
      // console.log('ERROR WRAPPED', innerFn)
      const slice = queue.slice()
      queue = []
      slice.forEach(([resolve, reject]) => reject(new Error('Queue discarded.')))
      // queue = []
    }
    lock = false
    if (queue.length) {
      if (recentOnly) {
        const [resolve, reject, _args] = queue.pop()
        const slice = queue.slice()
        queue = []
        slice.forEach(([resolve, reject]) => reject(new Error('atomic: Queue discarded.')))
        atomicWrapperFn(..._args).then(resolve, reject).catch(reject)
      } else {
        const [resolve, reject, _args] = queue.shift()
        atomicWrapperFn(..._args).then(resolve, reject).catch(reject)
      }
    }
    if (result instanceof Error) return Promise.reject(result)
    return result
  }

  atomicWrapperFn.innerFn = innerFn

  return atomicWrapperFn
}
