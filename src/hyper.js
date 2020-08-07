
// const merger = (...args) => {
//   args = args.filter(arg => typeof arg !== 'string')
//   for (let i = args.length - 1; i >= 1; i--) {
//     for (let j = i-1; j >= 0; j--) {
//       Object.assign(args[j], args[i])
//     }
//   }
//   return args[0]
// }

export default ({
  context: top,
  execute,
  preprocess = () => x => x,
  mergeDown = Object.assign,
  mergeSide = Object.assign,
  mergeUp = x => x
}) => {
  const fnMap = new Map
  const proto = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(top))
  const desc = Object.getOwnPropertyDescriptors(top)

  const createHyperFn = parent => {
    const context = { ...parent, parent }

    const fn = async (...args) => {

      const pre = preprocess(fn)

      const fns = args
        .map(pre)
        .filter(arg => typeof arg === 'function')
        .map(_fn => [
          _fn,
          // mergeSide(
          mergeDown(createHyperFn(_fn), fn, ...args),
            ...args
          // )
        ])

      let lastSiblingHyperFn = null
      for (const [_fn, hyperFn] of fns) {
        if (!fnMap.has(_fn)) {
          if (_fn.constructor.name === 'AsyncFunction') {
            const result = await execute(_fn, hyperFn)
            if (Array.isArray(result)) {
              fnMap.set(_fn, fn => fn(...result))
              //   ...(
              //     mergeSide(...result, ...args),
              //     result
              //   )
              // ))
            } else {
              fnMap.set(_fn, result)
            }
          } else {
            fnMap.set(_fn, _fn)
          }
        }
        // merge(fn, hyperFn,
        await execute(
          fnMap.get(_fn),
          mergeSide(hyperFn, lastSiblingHyperFn)
        )

        lastSiblingHyperFn = hyperFn
        // merge(fn, hyperFn, fnResult)
        // await execute(fnMap.get(_fn), hyperFn)
      }

      mergeUp(fn, lastSiblingHyperFn)
      // merge(context.parent, context, ...args, fn)

      // return fn
    }

    Object.defineProperties(fn, desc)
    mergeDown(fn, context)
    Object.defineProperties(fn, proto)

    return fn
  }

  return createHyperFn(top)
}
