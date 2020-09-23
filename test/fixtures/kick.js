import Wavetable from './wavetable.js'
import Lowpass from './lowpass.js'
export default async c => {
  const lp = await Lowpass(c)
  const sin = await Wavetable(c, { osc: './sin.js' })
  return (c, {
    hz = 200,
    pitchDecay = 15,
    volDecay = 15,
    filter = .5
  }) => {
    if (c.p === 0) sin.setPhase(0)
    return lp({ x: sin(c, {
      hz: hz * Math.exp(-c.t * pitchDecay)
    }) * Math.exp(-c.t * volDecay) }, { a: filter })
  }
}