export default class RingBuffer {
  constructor (target) {
    let needle = 0
    let length = target.length
    return new Proxy(target, {
      get (object, key) {
        if (Number(key) == key) {
          key = Number(key)

          let pos = needle

          if (key !== 0) {
            pos += key

            if (pos > length - 1) {
              pos = pos % length
            } else if (pos < 0) {
              while (pos < 0) {
                pos += length
              }
            }
          }

          return object[pos]
        }

        return object[key]
      },
      set (object, key, value, proxy) {
        if (Number(key) == key) {
          key = Number(key)

          let pos = needle

          if (key === 0) {
            needle++
            if (needle > length - 1) {
              needle = 0
            }
          } else {
            pos += key

            if (pos > length - 1) {
              pos = pos % length
            } else if (pos < 0) {
              while (pos < 0) {
                pos += length
              }
            }
          }

          object[pos] = value
        }

        return true
      }
    })
  }
}
