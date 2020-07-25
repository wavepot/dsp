export default (t, { hz = 1 } = {}) =>
  Math.abs(1 - (2 * t * hz) % 2) * 2 - 1
