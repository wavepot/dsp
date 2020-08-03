export default (top, execute, merge = Object.assign) => {
  const fnMap = new Map

  const createHyperFn = parent => {
    const context = { ...parent, parent }

    const fn = async (...args) => {
      merge(fn, ...args)

      const fns = args
        .filter(arg => typeof arg === 'function')
        .map(_fn => [_fn, merge(createHyperFn(_fn), fn)])

      for (const [_fn, hyperFn] of fns) {
        if (!fnMap.has(_fn)) {
          if (_fn.constructor.name === 'AsyncFunction') {
            const result = await execute(_fn, hyperFn)
            if (Array.isArray(result)) {
              fnMap.set(_fn, fn => fn(...result))
            } else {
              fnMap.set(_fn, result)
            }
          } else {
            fnMap.set(_fn, _fn)
          }
        }
        merge(fn, hyperFn, await execute(fnMap.get(_fn), hyperFn))
      }

      merge(context.parent, context, fn)

      return fn
    }

    merge(fn, context)

    return fn
  }

  return createHyperFn(top)
}
