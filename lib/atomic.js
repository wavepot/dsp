export default (innerFn, { recentOnly = false } = {}) => {
  let queue = []

  let lock = false

  const atomicWrapperFn = async (...args) => {
    if (lock) {
      return new Promise((resolve, reject) =>
        queue.push([resolve, reject, args]))
    }
    lock = true
    const result = await innerFn(...args)
    lock = false
    if (queue.length) {
      if (recentOnly) {
        const [resolve, reject, _args] = queue.pop()
        const slice = queue.slice()
        queue = []
        slice.forEach(([resolve, reject]) => reject(new Error('Queue discarded.')))
        atomicWrapperFn(..._args).then(resolve, reject)
      } else {
        const [resolve, reject, _args] = queue.shift()
        atomicWrapperFn(..._args).then(resolve, reject)
      }
    }
    return result
  }

  return atomicWrapperFn
}
