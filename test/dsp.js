import './setup.js'
import { Context, mix } from '../../src/dsp.js'

import counter from './fixtures/counter.js'
import nested from './fixtures/nested.js'
import deeplyNested from './fixtures/deeply-nested.js'
import triangle from './fixtures/triangle.js'

describe("Context(fn)", () => {
  it("should return a context fn", () => {
    const context = Context({ buffer: [[0]] })
    expect(context).to.be.a('function')
  })

  it("should serialize with .toJSON()", () => {
    const context = Context({ buffer: [[0]] })
    expect(context.toJSON()).to.be.an('object')
  })
})

describe("mix(fn)", () => {
  it("should return a render fn", () => {
    const render = mix(counter)
    expect(render).to.be.a('function')
  })
})

describe("render = mix(fn)", () => {
  describe("render({ buffer })", () => {
    it("should render given fn to given buffer", () => {
      const buffer = [new Float32Array(4)]
      const render = mix(counter)
      render({ buffer })
      const expected = [0,1,2,3]
      expect(buffer[0]).to.be.buffer(expected)
    })
  })
})

describe("render = mix(fn)", () => {
  describe("render params", () => {
    it("should use params", () => {
      const buffer = [new Float32Array(4)]

      const render = mix(({ s }, params) => triangle(s, params))

      render({ buffer, sampleRate: 4 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 4 }, { hz: 2 })
      expect(buffer[0]).to.be.buffer([-1,1,-1,1])
    })
  })
})

describe("render = mix(fn)", () => {
  describe("render params", () => {
    it("should use default params", () => {
      const buffer = [new Float32Array(4)]

      const render = mix(({ s }) => triangle(s))

      render({ buffer, sampleRate: 4 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 2 })
      expect(buffer[0]).to.be.buffer([-1,1,-1,1])
    })
  })
})

describe("render = mix(fn)", () => {
  describe("integrator `t`", () => {
    it("should vary rate with bpm", () => {
      const buffer = [new Float32Array(4)]

      const render = mix(({ t }, params) => triangle(t, params))

      render({ buffer, sampleRate: 4, bpm: 60 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 4, bpm: 120 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([-1,1,-1,1])
    })
  })
})

describe("render = mix(fn)", () => {
  describe("default integrator `t`", () => {
    it("should use default integrator", () => {
      const buffer = [new Float32Array(4)]

      const render = mix(triangle)

      render({ buffer, sampleRate: 4, bpm: 60 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 4, bpm: 120 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([-1,1,-1,1])
    })
  })
})

describe("render = mix(fn)", () => {
  describe("integrator `s`", () => {
    it("should use sample rate hz to render independent of bpm", () => {
      const buffer = [new Float32Array(4)]

      const render = mix(({ s }, params) => triangle(s, params))

      render({ buffer, sampleRate: 4, bpm: 60 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 4, bpm: 120 }, { hz: 1 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])

      render({ buffer, sampleRate: 4 }, { hz: 2 })
      expect(buffer[0]).to.be.buffer([-1,1,-1,1])

      render({ buffer, sampleRate: 8 }, { hz: 2 })
      expect(buffer[0]).to.be.buffer([0,-1,0,1])
    })
  })
})

describe("render = mix(nested)", () => {
  it("should render given nested fns as waterfall to given buffer", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(nested)
    render({ buffer })
    const expected = [3,3,3,3]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("render = mix(deeplyNested)", () => {
  it("should render given deeply nested fns as waterfall to given buffer", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(deeplyNested)
    render({ buffer })
    const expected = [3,3,3,3]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("mono and stereo", () => {
  it("mono to mono", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(() => 1)
    render({ buffer })
    const expected = [1,1,1,1]
    expect(buffer[0]).to.be.buffer(expected)
  })

  it("mono to stereo", () => {
    const buffer = [new Float32Array(4), new Float32Array(4)]
    const render = mix(() => 1)
    render({ buffer })
    const expected = [.5,.5,.5,.5]
    expect(buffer[0]).to.be.buffer(expected)
    expect(buffer[1]).to.be.buffer(expected)
  })

  it("stereo to stereo", () => {
    const buffer = [new Float32Array(4), new Float32Array(4)]
    const render = mix(() => [1,2])
    render({ buffer })
    const expected_0 = [1,1,1,1]
    const expected_1 = [2,2,2,2]
    expect(buffer[0]).to.be.buffer(expected_0)
    expect(buffer[1]).to.be.buffer(expected_1)
  })

  it("stereo to mono", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(() => [1,2])
    render({ buffer })
    const expected = [3,3,3,3]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("read stereo input, write to stereo buffer", () => {
  it("should properly read", () => {
    const buffer = [new Float32Array(4), new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => [1,2],
        t => [t.input[0] + 2, t.input[1] + 3]
      )
    )
    render({ buffer })
    const expected_0 = [3,3,3,3]
    const expected_1 = [5,5,5,5]
    expect(buffer[0]).to.be.buffer(expected_0)
    expect(buffer[1]).to.be.buffer(expected_1)
  })
})

describe("write mono, read stereo, write stereo to stereo buffer", () => {
  it("should properly read", () => {
    const buffer = [new Float32Array(4), new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => 1,
        t => [t.input[0] + 2.5, t.input[1] + 3.5]
      )
    )
    render({ buffer })
    const expected_0 = [3,3,3,3]
    const expected_1 = [4,4,4,4]
    expect(buffer[0]).to.be.buffer(expected_0)
    expect(buffer[1]).to.be.buffer(expected_1)
  })
})

describe("write mono, read stereo, write stereo to mono buffer", () => {
  it("should ignore right channel write", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => 1,
        t => [t.input[0] + 1, t.input[1] + 1]
      )
    )
    render({ buffer })
    const expected = [2,2,2,2]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("write mono, read mono, write stereo to mono buffer", () => {
  it("should join right channel write", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => 1,
        t => [t.input[0] + 1, 1]
      )
    )
    render({ buffer })
    const expected = [3,3,3,3]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("write stereo, read mono, write mono to stereo buffer", () => {
  it("should properly read", () => {
    const buffer = [new Float32Array(4), new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => [1,2],
        t => t.input + 1,
      )
    )
    render({ buffer })
    const expected_0 = [2,2,2,2]
    const expected_1 = [2,2,2,2]
    expect(buffer[0]).to.be.buffer(expected_0)
    expect(buffer[1]).to.be.buffer(expected_1)
  })
})

describe("write stereo, read mono, write mono to mono buffer", () => {
  it("should properly read", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(
      mix => mix(
        t => [1,2],
        t => t.input + 1,
      )
    )
    render({ buffer })
    const expected = [4,4,4,4]
    expect(buffer[0]).to.be.buffer(expected)
  })
})

describe("attempt to write to input", () => {
  it("should throw", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(t => t.input = 1)
    try {
      render({ buffer })
    } catch (err) {
      expect(err.message).to.contain('not writable')
    }
  })
})

describe("attempt to write to input element", () => {
  it("should throw", () => {
    const buffer = [new Float32Array(4)]
    const render = mix(t => t.input[0] = 1)
    try {
      render({ buffer })
    } catch (err) {
      expect(err.message).to.contain('not writable')
    }
  })
})

describe("unsupported number of channels", () => {
  it("should throw", () => {
    const buffer = [new Float32Array(4), new Float32Array(4), new Float32Array(4)]
    const render = mix(t => 1)
    try {
      render({ buffer })
    } catch (err) {
      expect(err.message).to.contain('unsupported')
    }
  })
})
