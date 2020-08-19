import atomic from '../lib/atomic.js'
import checksumOf from '../lib/checksum.js'

export default ({
  context: top,
  execute,
  mergeDown = Object.assign,
  mergeSide = Object.assign,
  mergeUp = x => x
}) => {
  const fnMap = new Map
  const proto = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(top))
  const desc = Object.getOwnPropertyDescriptors(top)

  const createHyperFn = parent => {
    const context = { ...parent, parent }

    const fn = atomic(async (...args) => {
      fn.setTimeout(5000)

      if (parent === top) mergeDown(fn, ...args)

      const fns = args
        .filter(arg => typeof arg === 'function')
        .map(_fn => [
          _fn,
          mergeDown(
            mergeDown(createHyperFn(_fn), fn),
            ...args
          )
        ])

      let lastSiblingHyperFn = null
      for (const [_fn, hyperFn] of fns) {
        const checksum = checksumOf(_fn, fn)
        if (!fnMap.has(checksum)) {
          if (_fn.constructor.name === 'AsyncFunction') {
            const result = await execute(_fn, hyperFn)
            if (Array.isArray(result)) {
              fnMap.set(checksum, fn =>
                fn(...mergeDown(result, ...args))
              )
            } else {
              fnMap.set(checksum, typeof result === 'function' ? result : () => {})
            }
          } else {
            fnMap.set(checksum, _fn)
          }
        }

        await execute(
          fnMap.get(checksum),
          mergeSide(hyperFn, lastSiblingHyperFn)
        )

        lastSiblingHyperFn = hyperFn
      }

      mergeUp(fn, lastSiblingHyperFn)
    }, { recentOnly: true, timeout: 60000 })

    Object.defineProperties(fn, desc)
    mergeDown(fn, context)
    Object.defineProperties(fn, proto)

    fn.innerFn = parent

    return fn
  }

  return createHyperFn(top)
}
