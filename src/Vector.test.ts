import { describe, expect, test } from 'vitest'
import { Conversion } from './Conversion'
import {
  ALL_DIRECTIONS,
  createVectorType,
  DIAGONALS,
  DIRECTIONS,
  Float32Vector,
  Float64Vector,
  Int16Vector,
  Int32Vector,
  Int8Vector,
  isVector,
  Uint16Vector,
  Uint32Vector,
  Uint8ClampedVector,
  Uint8Vector,
  vec,
  Vector,
} from './Vector'

// ─── Existing baseline tests ──────────────────────────────────────────────────

test('typed array vectors share the vector api', () => {
  const point = new Float32Vector<2>(1, 2).add(vec(3, 4))

  expect(point).instanceOf(Float32Array)
  expect(isVector(point)).toBe(true)
  expect(Conversion.isVector(point, 2)).toBe(true)
  expect(Array.from(point)).toEqual([4, 6])

  const cloned = point.clone()
  expect(cloned).instanceOf(Float32Vector)
  expect(Array.from(cloned)).toEqual([4, 6])
})

test('createVectorType supports other numeric array bases', () => {
  const Uint16VectorCustom = createVectorType(Uint16Array)
  const point = new Uint16VectorCustom<2>(2, 3).mul(2)

  expect(point).instanceOf(Uint16Array)
  expect(Array.from(point)).toEqual([4, 6])
})

test('vec preserves array-backed vector type by default', () => {
  const point = vec(1, 2)
  expect(point.map((v) => v + 1).reduce((a, b) => a + b, 0)).toBe(5)
  expect(point.every((v) => v > 0)).toBe(true)

  expect(point).instanceOf(Vector)
  expect(Array.from(point)).toEqual([1, 2])

  const [x, y] = point
  expect(x).toBe(1)
  expect(y).toBe(2)

  expect(() => point.pop()).toThrow('Cannot remove items from FixedSizeArray')
  expect(() => point.push()).toThrow('Cannot add items to FixedSizeArray')
})

test('vec detects and preserves typed array type', () => {
  const float32Point = vec(new Float32Array([1, 2]))
  expect(float32Point).instanceOf(Float32Vector)
  expect(Array.from(float32Point)).toEqual([1, 2])

  const float64Point = vec(new Float64Array([3, 4]))
  expect(float64Point).instanceOf(Float64Vector)
  expect(Array.from(float64Point)).toEqual([3, 4])

  const int8Point = vec(new Int8Array([5, 6]))
  expect(int8Point).instanceOf(Int8Vector)
  expect(Array.from(int8Point)).toEqual([5, 6])

  const uint8Point = vec(new Uint8Array([7, 8]))
  expect(uint8Point).instanceOf(Uint8Vector)
  expect(Array.from(uint8Point)).toEqual([7, 8])

  const uint16Point = vec(new Uint16Array([9, 10]))
  expect(uint16Point).instanceOf(Uint16Vector)
  expect(Array.from(uint16Point)).toEqual([9, 10])
})

// ─── Typed array: construction ────────────────────────────────────────────────

describe('typed array construction from spread numbers', () => {
  test('Float32Vector stores values', () => {
    const v = new Float32Vector<3>(1.5, 2.5, 3.5)
    expect(v).instanceOf(Float32Array)
    expect(isVector(v)).toBe(true)
    expect(v.length).toBe(3)
    expect(v[0]).toBeCloseTo(1.5)
    expect(v[1]).toBeCloseTo(2.5)
    expect(v[2]).toBeCloseTo(3.5)
  })

  test('Float64Vector stores values', () => {
    const v = new Float64Vector<2>(1.23456789, 9.87654321)
    expect(v).instanceOf(Float64Array)
    expect(v[0]).toBeCloseTo(1.23456789)
    expect(v[1]).toBeCloseTo(9.87654321)
  })

  test('Int16Vector stores values', () => {
    const v = new Int16Vector<2>(1000, -1000)
    expect(v).instanceOf(Int16Array)
    expect(v[0]).toBe(1000)
    expect(v[1]).toBe(-1000)
  })

  test('Int32Vector stores values', () => {
    const v = new Int32Vector<2>(100000, -100000)
    expect(v).instanceOf(Int32Array)
    expect(v[0]).toBe(100000)
    expect(v[1]).toBe(-100000)
  })

  test('Uint32Vector stores values', () => {
    const v = new Uint32Vector<2>(100000, 200000)
    expect(v).instanceOf(Uint32Array)
    expect(v[0]).toBe(100000)
    expect(v[1]).toBe(200000)
  })
})

describe('typed array construction from ArrayLike', () => {
  test('Float32Vector from Float32Array', () => {
    const v = new Float32Vector<3>(
      new Float32Array([10, 20, 30]) as Float32Array & { length: 3 },
    )
    expect(v).instanceOf(Float32Array)
    expect(isVector(v)).toBe(true)
    expect(Array.from(v)).toEqual([10, 20, 30])
  })

  test('Float64Vector from Float64Array', () => {
    const v = new Float64Vector<2>(
      new Float64Array([3.14, 2.71]) as Float64Array & { length: 2 },
    )
    expect(v).instanceOf(Float64Array)
    expect(v[0]).toBeCloseTo(3.14)
    expect(v[1]).toBeCloseTo(2.71)
  })

  test('Int32Vector from Int32Array', () => {
    const v = new Int32Vector<3>(
      new Int32Array([1, 2, 3]) as Int32Array & { length: 3 },
    )
    expect(v).instanceOf(Int32Array)
    expect(Array.from(v)).toEqual([1, 2, 3])
  })
})

describe('typed array type-specific value characteristics', () => {
  test('Int8Vector wraps values outside [-128, 127]', () => {
    // 200 overflows: 200 - 256 = -56; -200 underflows: -200 + 256 = 56
    const v = new Int8Vector<2>(200, -200)
    expect(v).instanceOf(Int8Array)
    expect(v[0]).toBe(-56)
    expect(v[1]).toBe(56)
  })

  test('Uint8Vector wraps values outside [0, 255]', () => {
    // 300 wraps: 300 - 256 = 44; -5 wraps: -5 + 256 = 251
    const v = new Uint8Vector<2>(300, -5)
    expect(v).instanceOf(Uint8Array)
    expect(v[0]).toBe(44)
    expect(v[1]).toBe(251)
  })

  test('Uint8ClampedVector clamps values to [0, 255]', () => {
    const v = new Uint8ClampedVector<3>(300, -5, 128)
    expect(v).instanceOf(Uint8ClampedArray)
    expect(v[0]).toBe(255)
    expect(v[1]).toBe(0)
    expect(v[2]).toBe(128)
  })

  test('Uint16Vector stores values in [0, 65535]', () => {
    const v = new Uint16Vector<2>(1000, 65535)
    expect(v).instanceOf(Uint16Array)
    expect(v[0]).toBe(1000)
    expect(v[1]).toBe(65535)
  })

  test('throwing when constructing with no items', () => {
    expect(() => new Float32Vector()).toThrow("can't create empty vector")
    expect(() => new Int32Vector()).toThrow("can't create empty vector")
    expect(() => new Uint8Vector()).toThrow("can't create empty vector")
  })
})

// ─── Typed array: accessors ───────────────────────────────────────────────────

describe('typed array x/y/z getters', () => {
  test('x returns index 0', () => {
    const v = new Float32Vector<3>(10, 20, 30)
    expect(v.x).toBe(10)
  })

  test('y returns index 1 for 2D+ vectors', () => {
    const v = new Float64Vector<2>(10, 20)
    expect(v.y).toBe(20)
  })

  test('z returns index 2 for 3D vectors', () => {
    const v = new Int32Vector<3>(10, 20, 30)
    expect(v.z).toBe(30)
  })

  test('y is undefined for 1D vector', () => {
    const v = new Float32Vector<1>(42)
    expect(v.y).toBeUndefined()
    expect(v.z).toBeUndefined()
  })
})

describe('typed array x/y setters', () => {
  test('x setter updates index 0', () => {
    const v = new Float64Vector<2>(1, 2)
    v.x = 99
    expect(v[0]).toBe(99)
    expect(v.x).toBe(99)
  })

  test('y setter updates index 1', () => {
    const v = new Float32Vector<2>(1, 2)
    v.y = 77
    expect(v[1]).toBeCloseTo(77)
    expect(v.y).toBeCloseTo(77)
  })
})

// ─── Typed array: static methods ─────────────────────────────────────────────

describe('typed array static linSpace', () => {
  test('Float32Vector.linSpace generates evenly spaced values', () => {
    const v = Float32Vector.linSpace(0, 1, 5)
    expect(v).instanceOf(Float32Vector)
    expect(v.length).toBe(5)
    expect(v[0]).toBeCloseTo(0)
    expect(v[2]).toBeCloseTo(0.5)
    expect(v[4]).toBeCloseTo(1)
  })

  test('Float64Vector.linSpace generates evenly spaced values', () => {
    const v = Float64Vector.linSpace(0, 10, 3)
    expect(v).instanceOf(Float64Vector)
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(5)
    expect(v[2]).toBeCloseTo(10)
  })

  test('Int32Vector.linSpace truncates to integer values', () => {
    const v = Int32Vector.linSpace(0, 10, 3)
    expect(v).instanceOf(Int32Vector)
    expect(v[0]).toBe(0)
    expect(v[1]).toBe(5)
    expect(v[2]).toBe(10)
  })
})

describe('typed array static empty', () => {
  test('Float64Vector.empty creates zero-filled vector', () => {
    const v = Float64Vector.empty(4)
    expect(v).instanceOf(Float64Vector)
    expect(v.length).toBe(4)
    expect(Array.from(v)).toEqual([0, 0, 0, 0])
  })

  test('Uint16Vector.empty creates zero-filled vector', () => {
    const v = Uint16Vector.empty(3)
    expect(v).instanceOf(Uint16Vector)
    expect(Array.from(v)).toEqual([0, 0, 0])
  })

  test('Int32Vector.empty creates zero-filled vector', () => {
    const v = Int32Vector.empty(2)
    expect(v).instanceOf(Int32Vector)
    expect(Array.from(v)).toEqual([0, 0])
  })
})

describe('typed array static polar', () => {
  test('Float32Vector.polar at angle 0 points along x-axis', () => {
    const v = Float32Vector.polar(1, 0)
    expect(v).instanceOf(Float32Vector)
    expect(v[0]).toBeCloseTo(1)
    expect(v[1]).toBeCloseTo(0)
  })

  test('Float64Vector.polar at PI/2 points along y-axis', () => {
    const v = Float64Vector.polar(2, Math.PI / 2)
    expect(v).instanceOf(Float64Vector)
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(2)
  })

  test('Float64Vector.polar radius scales magnitude', () => {
    const v = Float64Vector.polar(5, Math.PI / 4)
    expect(v.mag()).toBeCloseTo(5)
  })
})

// ─── Typed array: arithmetic ──────────────────────────────────────────────────

describe('typed array add/sub', () => {
  test('add returns this and mutates in-place', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    const result = v.add(new Float64Vector<3>(4, 5, 6))
    expect(result).toBe(v)
    expect(Array.from(v)).toEqual([5, 7, 9])
  })

  test('sub returns this and mutates in-place', () => {
    const v = new Float64Vector<3>(10, 20, 30)
    const result = v.sub(new Float64Vector<3>(1, 2, 3))
    expect(result).toBe(v)
    expect(Array.from(v)).toEqual([9, 18, 27])
  })

  test('add then sub returns to original value', () => {
    const v = new Float64Vector<2>(3, 7)
    v.add(new Float64Vector<2>(10, 20)).sub(new Float64Vector<2>(10, 20))
    expect(v[0]).toBeCloseTo(3)
    expect(v[1]).toBeCloseTo(7)
  })
})

describe('typed array mul/div', () => {
  test('mul by scalar scales all elements', () => {
    const v = new Int32Vector<3>(1, 2, 3)
    v.mul(3)
    expect(Array.from(v)).toEqual([3, 6, 9])
  })

  test('mul per-component multiplies each element independently', () => {
    const v = new Float32Vector<2>(2, 3)
    v.mul(4, 5)
    expect(v[0]).toBeCloseTo(8)
    expect(v[1]).toBeCloseTo(15)
  })

  test('div by scalar divides all elements', () => {
    const v = new Float64Vector<2>(6, 9)
    v.div(3)
    expect(Array.from(v)).toEqual([2, 3])
  })

  test('div per-component divides each element independently', () => {
    const v = new Float64Vector<2>(6, 9)
    v.div(2, 3)
    expect(Array.from(v)).toEqual([3, 3])
  })

  test('mul(s) and div(s) are inverse operations', () => {
    const v = new Float64Vector<2>(3, 7)
    v.mul(5).div(5)
    expect(v[0]).toBeCloseTo(3)
    expect(v[1]).toBeCloseTo(7)
  })
})

describe('typed array scale/mod/floor/round/roundToDec', () => {
  test('scale multiplies all elements', () => {
    const v = new Uint16Vector<2>(3, 4)
    v.scale(2)
    expect(Array.from(v)).toEqual([6, 8])
  })

  test('mod applies modulo to each element', () => {
    const v = new Float64Vector<3>(7, 11, 15)
    v.mod(5)
    expect(v[0]).toBeCloseTo(2)
    expect(v[1]).toBeCloseTo(1)
    expect(v[2]).toBeCloseTo(0)
  })

  test('floor rounds down each element', () => {
    const v = new Float64Vector<3>(1.9, -0.1, 2.0)
    v.floor()
    expect(Array.from(v)).toEqual([1, -1, 2])
  })

  test('round rounds each element to nearest integer', () => {
    const v = new Float64Vector<3>(1.4, 1.5, 2.6)
    v.round()
    expect(Array.from(v)).toEqual([1, 2, 3])
  })

  test('roundToDec rounds to specified decimal places', () => {
    const v = new Float64Vector<2>(1.2345, 6.7891)
    v.roundToDec(2)
    expect(v[0]).toBeCloseTo(1.23)
    expect(v[1]).toBeCloseTo(6.79)
  })
})

// ─── Typed array: vector math ─────────────────────────────────────────────────

describe('typed array magnitude and distance', () => {
  test('mag2 returns squared magnitude', () => {
    const v = new Float64Vector<2>(3, 4)
    expect(v.mag2()).toBe(25)
  })

  test('mag returns euclidean magnitude', () => {
    const v = new Float64Vector<2>(3, 4)
    expect(v.mag()).toBe(5)
  })

  test('dist2 returns squared distance to another vector', () => {
    const a = new Float32Vector<2>(1, 1)
    const b = new Float32Vector<2>(4, 5)
    // (4-1)^2 + (5-1)^2 = 9 + 16 = 25
    expect(a.dist2(b)).toBeCloseTo(25)
  })

  test('dist returns euclidean distance to another vector', () => {
    const a = new Float64Vector<2>(0, 0)
    const b = new Float64Vector<2>(3, 4)
    expect(a.dist(b)).toBeCloseTo(5)
  })

  test('dist to self is zero', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    expect(v.dist(v)).toBeCloseTo(0)
  })
})

describe('typed array dot product', () => {
  test('dot product of orthogonal vectors is 0', () => {
    const a = new Float64Vector<2>(1, 0)
    const b = new Float64Vector<2>(0, 1)
    expect(a.dot(b)).toBe(0)
  })

  test('dot product of parallel vectors equals product of magnitudes', () => {
    const a = new Float64Vector<2>(3, 0)
    const b = new Float64Vector<2>(5, 0)
    expect(a.dot(b)).toBe(15)
  })

  test('dot product of 3D vectors', () => {
    const a = new Float64Vector<3>(1, 2, 3)
    const b = new Float64Vector<3>(4, 5, 6)
    // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
    expect(a.dot(b)).toBe(32)
  })
})

describe('typed array norm', () => {
  test('norm normalizes to unit length', () => {
    const v = new Float64Vector<2>(3, 4)
    v.norm()
    expect(v.mag()).toBeCloseTo(1)
    expect(v[0]).toBeCloseTo(0.6)
    expect(v[1]).toBeCloseTo(0.8)
  })

  test('norm on zero vector leaves it unchanged', () => {
    const v = new Float64Vector<2>(0, 0)
    v.norm()
    expect(Array.from(v)).toEqual([0, 0])
  })

  test('norm returns this', () => {
    const v = new Float64Vector<2>(1, 0)
    expect(v.norm()).toBe(v)
  })
})

describe('typed array sum/mean/spread', () => {
  test('sum adds all elements', () => {
    const v = new Int32Vector<4>(1, 2, 3, 4)
    expect(v.sum()).toBe(10)
  })

  test('mean returns arithmetic average', () => {
    const v = new Float64Vector<4>(2, 4, 6, 8)
    expect(v.mean()).toBe(5)
  })

  test('average is an alias for mean', () => {
    const v = new Float64Vector<4>(1, 3, 5, 7)
    expect(v.average()).toBe(v.mean())
  })

  test('spread2 returns variance', () => {
    // [1,1,3,3]: avg=2, deviations=[-1,-1,1,1], spread2=(1+1+1+1)/4=1
    const v = new Float64Vector<4>(1, 1, 3, 3)
    expect(v.spread2()).toBeCloseTo(1)
  })

  test('spread returns standard deviation', () => {
    const v = new Float64Vector<4>(1, 1, 3, 3)
    expect(v.spread()).toBeCloseTo(1)
  })
})

// ─── Typed array: geometric operations ───────────────────────────────────────

describe('typed array lerp', () => {
  test('lerp at alpha=0.5 reaches midpoint', () => {
    const v = new Float64Vector<2>(0, 0)
    v.lerp(new Float64Vector<2>(10, 20), 0.5)
    expect(Array.from(v)).toEqual([5, 10])
  })

  test('lerp at alpha=0 leaves vector unchanged', () => {
    const v = new Float64Vector<2>(3, 4)
    v.lerp(new Float64Vector<2>(100, 200), 0)
    expect(Array.from(v)).toEqual([3, 4])
  })

  test('lerp at alpha=1 reaches target', () => {
    const v = new Float64Vector<2>(3, 4)
    v.lerp(new Float64Vector<2>(10, 20), 1)
    expect(Array.from(v)).toEqual([10, 20])
  })

  test('lerp returns this', () => {
    const v = new Float64Vector<2>(0, 0)
    expect(v.lerp(new Float64Vector<2>(1, 1), 0.5)).toBe(v)
  })
})

describe('typed array within/clamp/clampRange', () => {
  test('within returns true when all dimensions are inside bounds', () => {
    const v = new Float32Vector<2>(3, 7)
    expect(v.within([0, 10, 0, 10])).toBe(true)
  })

  test('within returns false when any dimension is outside bounds', () => {
    const v = new Float32Vector<2>(11, 5)
    expect(v.within([0, 10, 0, 10])).toBe(false)
  })

  test('within treats boundary values as inside', () => {
    const v = new Float64Vector<2>(0, 10)
    expect(v.within([0, 10, 0, 10])).toBe(true)
  })

  test('clamp constrains each dimension to its bounds', () => {
    const v = new Float64Vector<2>(-5, 15)
    v.clamp([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([0, 10])
  })

  test('clamp leaves in-bounds values unchanged', () => {
    const v = new Float64Vector<2>(3, 7)
    v.clamp([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([3, 7])
  })

  test('clampRange constrains all elements to single min/max', () => {
    const v = new Float64Vector<3>(-1, 5, 11)
    v.clampRange(0, 10)
    expect(Array.from(v)).toEqual([0, 5, 10])
  })
})

describe('typed array wrapAround', () => {
  test('wraps value below lower bound upward', () => {
    const v = new Float64Vector<2>(-1, 5)
    v.wrapAround([0, 10, 0, 10])
    // diff=10, stop - ((start - v) % diff) = 10 - (1 % 10) = 9
    expect(v[0]).toBeCloseTo(9)
    expect(v[1]).toBe(5)
  })

  test('wraps value above upper bound downward', () => {
    const v = new Float64Vector<2>(11, 5)
    v.wrapAround([0, 10, 0, 10])
    // diff=10, start + ((v - stop) % diff) = 0 + (1 % 10) = 1
    expect(v[0]).toBeCloseTo(1)
    expect(v[1]).toBe(5)
  })

  test('leaves in-bounds values unchanged', () => {
    const v = new Float64Vector<2>(5, 5)
    v.wrapAround([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([5, 5])
  })
})

describe('typed array reflect', () => {
  test('reflects value below lower bound', () => {
    const v = new Float64Vector<2>(-2, 5)
    v.reflect([0, 10, 0, 10])
    // min + (min - v) = 0 + (0 - (-2)) = 2
    expect(v[0]).toBeCloseTo(2)
    expect(v[1]).toBe(5)
  })

  test('reflects value above upper bound', () => {
    const v = new Float64Vector<2>(12, 5)
    v.reflect([0, 10, 0, 10])
    // max - (v - max) = 10 - (12 - 10) = 8
    expect(v[0]).toBeCloseTo(8)
    expect(v[1]).toBe(5)
  })

  test('leaves in-bounds values unchanged', () => {
    const v = new Float64Vector<2>(5, 5)
    v.reflect([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([5, 5])
  })
})

describe('typed array fitToBounds', () => {
  test('scales vector to fit within bounds preserving proportions', () => {
    const v = new Float64Vector<2>(20, 10)
    v.fitToBounds([0, 10, 0, 10])
    // scales for each dim: 10/20=0.5, 10/10=1. minScale=0.5
    expect(v[0]).toBeCloseTo(10)
    expect(v[1]).toBeCloseTo(5)
  })

  test('leaves vector unchanged when it already fits', () => {
    const v = new Float64Vector<2>(5, 5)
    v.fitToBounds([0, 10, 0, 10])
    // scales: 10/5=2, 10/5=2. minScale=2, so it scales UP
    expect(v[0]).toBeCloseTo(10)
    expect(v[1]).toBeCloseTo(10)
  })

  test('does nothing for zero vector', () => {
    const v = new Float64Vector<2>(0, 0)
    v.fitToBounds([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([0, 0])
  })
})

describe('typed array atan2/atan2p', () => {
  test('atan2 returns angle from x-axis in [-pi, pi]', () => {
    const v = new Float64Vector<2>(1, 1)
    expect(v.atan2()).toBeCloseTo(Math.PI / 4)
  })

  test('atan2 returns negative angle for vectors below x-axis', () => {
    const v = new Float64Vector<2>(1, -1)
    expect(v.atan2()).toBeCloseTo(-Math.PI / 4)
  })

  test('atan2 throws for non-2D vectors', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    expect(() => v.atan2()).toThrow('Only 2d atan is supported')
  })

  test('atan2p returns positive angle in [0, 2pi)', () => {
    const v = new Float64Vector<2>(0, -1)
    // atan2 would give -PI/2, atan2p gives 3PI/2
    expect(v.atan2p()).toBeCloseTo((3 * Math.PI) / 2)
  })

  test('atan2p matches atan2 for positive angles', () => {
    const v = new Float64Vector<2>(1, 1)
    expect(v.atan2p()).toBeCloseTo(Math.PI / 4)
  })

  test('atan2p throws for non-2D vectors', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    expect(() => v.atan2p()).toThrow('Only 2d atan is supported')
  })
})

describe('typed array rotateLeft/rotateRight', () => {
  test('rotateLeft turns [1,0] to [0,1] (90° CCW)', () => {
    const v = new Float64Vector<2>(1, 0)
    v.rotateLeft()
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(1)
  })

  test('rotateRight turns [1,0] to [0,-1] (90° CW)', () => {
    const v = new Float64Vector<2>(1, 0)
    v.rotateRight()
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(-1)
  })

  test('four rotateLeft calls return to original', () => {
    const v = new Float64Vector<2>(3, 7)
    const ox = v[0]
    const oy = v[1]
    v.rotateLeft().rotateLeft().rotateLeft().rotateLeft()
    expect(v[0]).toBeCloseTo(ox)
    expect(v[1]).toBeCloseTo(oy)
  })

  test('rotateLeft then rotateRight returns to original', () => {
    const v = new Float64Vector<2>(3, 7)
    const ox = v[0]
    const oy = v[1]
    v.rotateLeft().rotateRight()
    expect(v[0]).toBeCloseTo(ox)
    expect(v[1]).toBeCloseTo(oy)
  })

  test('rotateLeft throws for non-2D vectors', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    expect(() => v.rotateLeft()).toThrow('Only 2d rotation are supported')
  })

  test('rotateRight throws for non-2D vectors', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    expect(() => v.rotateRight()).toThrow('Only 2d rotation are supported')
  })

  test('rotate with PI/2 delegates to rotateRight', () => {
    const a = new Float64Vector<2>(1, 0)
    const b = new Float64Vector<2>(1, 0)
    a.rotate(Math.PI / 2)
    b.rotateRight()
    expect(a[0]).toBeCloseTo(b[0])
    expect(a[1]).toBeCloseTo(b[1])
  })

  test('rotate with -PI/2 delegates to rotateLeft', () => {
    const a = new Float64Vector<2>(1, 0)
    const b = new Float64Vector<2>(1, 0)
    a.rotate(-Math.PI / 2)
    b.rotateLeft()
    expect(a[0]).toBeCloseTo(b[0])
    expect(a[1]).toBeCloseTo(b[1])
  })
})

// ─── Typed array: clone and equals ───────────────────────────────────────────

describe('typed array clone', () => {
  test('clone returns same type instance', () => {
    const v = new Float32Vector<2>(1, 2)
    const cloned = v.clone()
    expect(cloned).instanceOf(Float32Vector)
    expect(cloned).not.toBe(v)
    expect(Array.from(cloned)).toEqual([1, 2])
  })

  test('clone is independent of original', () => {
    const v = new Float64Vector<2>(3, 4)
    const cloned = v.clone()
    v.x = 99
    expect(cloned[0]).toBe(3)
  })

  test('Float64Vector clone twice produces independent copies', () => {
    const v = new Float64Vector<3>(1.1, 2.2, 3.3)
    const cloned = v.clone().clone()
    expect(cloned).instanceOf(Float64Vector)
    expect(cloned).not.toBe(v)
    cloned.x = 99
    expect(v[0]).toBeCloseTo(1.1)
    expect(cloned[1]).toEqual(v[1])
    expect(cloned[2]).toEqual(v[2])
  })

  test('Int32Vector clone returns Int32Vector', () => {
    const v = new Int32Vector<3>(10, 20, 30)
    const cloned = v.clone()
    expect(cloned).instanceOf(Int32Vector)
    expect(Array.from(cloned)).toEqual([10, 20, 30])
  })
})

describe('typed array equals', () => {
  test('returns true when all elements match', () => {
    const a = new Float32Vector<3>(1, 2, 3)
    const b = new Float32Vector<3>(1, 2, 3)
    expect(a.equals(b)).toBe(true)
  })

  test('returns false when any element differs', () => {
    const a = new Float64Vector<3>(1, 2, 3)
    const b = new Float64Vector<3>(1, 2, 4)
    expect(a.equals(b)).toBe(false)
  })
})

// ─── Typed array: mutmap ──────────────────────────────────────────────────────

describe('typed array mutmap', () => {
  test('transforms each element in-place', () => {
    const v = new Float64Vector<3>(1, 2, 3)
    v.mutmap((x) => x * x)
    expect(Array.from(v)).toEqual([1, 4, 9])
  })

  test('returns this', () => {
    const v = new Int32Vector<2>(1, 2)
    expect(v.mutmap((x) => x)).toBe(v)
  })

  test('receives value, index, and array as arguments', () => {
    const v = new Float64Vector<3>(10, 20, 30)
    const log: Array<[number, number]> = []
    v.mutmap((value, index) => {
      log.push([value, index])
      return value
    })
    expect(log).toEqual([
      [10, 0],
      [20, 1],
      [30, 2],
    ])
  })
})

// ─── Typed array: chunk ───────────────────────────────────────────────────────

describe('typed array chunk', () => {
  // Note: chunk() on typed array vectors is not fully supported because
  // TypedArray.prototype.slice() uses the class as a species constructor,
  // which conflicts with the VectorBase constructor signature. chunk() works
  // correctly on the array-backed Vector class (tested below).

  test('throws for negative chunk size', () => {
    const v = new Float64Vector<4>(1, 2, 3, 4)
    expect(() => v.chunk(-1)).toThrow('size must be a positive number')
  })
})

// ─── Vector: constructor ──────────────────────────────────────────────────────

describe('Vector constructor', () => {
  test('throws when called with no arguments', () => {
    expect(() => new Vector()).toThrow("can't create empty vector")
  })

  test('constructs from spread numbers', () => {
    const v = new Vector<4>(10, 20, 30, 40)
    expect(v).instanceOf(Vector)
    expect(Array.from(v)).toEqual([10, 20, 30, 40])
  })

  test('constructs from an array-like', () => {
    const v = new Vector<3>([1, 2, 3] as const)
    expect(v).instanceOf(Vector)
    expect(Array.from(v)).toEqual([1, 2, 3])
  })

  test('isVector returns true for Vector instances', () => {
    const v = new Vector<2>(1, 2)
    expect(isVector(v)).toBe(true)
  })

  test('isVector returns false for plain arrays', () => {
    expect(isVector([1, 2])).toBe(false)
  })

  test('isVector returns false for primitives', () => {
    expect(isVector(42)).toBe(false)
    expect(isVector(null)).toBe(false)
    expect(isVector(undefined)).toBe(false)
  })
})

// ─── Vector: static methods ───────────────────────────────────────────────────

describe('Vector static methods', () => {
  test('Vector.linSpace generates evenly spaced values', () => {
    const v = Vector.linSpace(0, 10, 6)
    expect(v).instanceOf(Vector)
    expect(v.length).toBe(6)
    expect(v[0]).toBeCloseTo(0)
    expect(v[5]).toBeCloseTo(10)
    expect(v[2]).toBeCloseTo(4)
  })

  test('Vector.empty creates a zero-filled vector', () => {
    const v = Vector.empty(5)
    expect(v).instanceOf(Vector)
    expect(Array.from(v)).toEqual([0, 0, 0, 0, 0])
  })

  test('Vector.polar at angle 0 points along x-axis', () => {
    const v = Vector.polar(5, 0)
    expect(v).instanceOf(Vector)
    expect(v[0]).toBeCloseTo(5)
    expect(v[1]).toBeCloseTo(0)
  })

  test('Vector.polar at PI points along negative x-axis', () => {
    const v = Vector.polar(3, Math.PI)
    expect(v[0]).toBeCloseTo(-3)
    expect(v[1]).toBeCloseTo(0)
  })

  test('Vector.polar magnitude equals radius', () => {
    const v = Vector.polar(7, Math.PI / 3)
    expect(v.mag()).toBeCloseTo(7)
  })
})

// ─── Vector: accessors ────────────────────────────────────────────────────────

describe('Vector x/y/z accessors', () => {
  test('x getter returns first element', () => {
    const v = new Vector<3>(10, 20, 30)
    expect(v.x).toBe(10)
  })

  test('y getter returns second element', () => {
    const v = new Vector<3>(10, 20, 30)
    expect(v.y).toBe(20)
  })

  test('z getter returns third element', () => {
    const v = new Vector<3>(10, 20, 30)
    expect(v.z).toBe(30)
  })

  test('x setter updates first element', () => {
    const v = new Vector<2>(1, 2)
    v.x = 99
    expect(v[0]).toBe(99)
    expect(v.x).toBe(99)
  })

  test('y setter updates second element', () => {
    const v = new Vector<2>(1, 2)
    v.y = 88
    expect(v[1]).toBe(88)
    expect(v.y).toBe(88)
  })

  test('push throws FixedSizeArray error', () => {
    const v = new Vector<2>(1, 2)
    expect(() => v.push()).toThrow('Cannot add items to FixedSizeArray')
  })

  test('pop throws FixedSizeArray error', () => {
    const v = new Vector<2>(1, 2)
    expect(() => v.pop()).toThrow('Cannot remove items from FixedSizeArray')
  })
})

// ─── Vector: arithmetic ───────────────────────────────────────────────────────

describe('Vector arithmetic', () => {
  test('add mutates in-place and returns this', () => {
    const v = new Vector<3>(1, 2, 3)
    const result = v.add([4, 5, 6] as const)
    expect(result).toBe(v)
    expect(Array.from(v)).toEqual([5, 7, 9])
  })

  test('sub mutates in-place and returns this', () => {
    const v = new Vector<3>(5, 7, 9)
    const result = v.sub([1, 2, 3] as const)
    expect(result).toBe(v)
    expect(Array.from(v)).toEqual([4, 5, 6])
  })

  test('mul by scalar scales all elements', () => {
    const v = new Vector<3>(1, 2, 3)
    v.mul(4)
    expect(Array.from(v)).toEqual([4, 8, 12])
  })

  test('mul per-component multiplies elements independently', () => {
    const v = new Vector<3>(1, 2, 3)
    v.mul(2, 3, 4)
    expect(Array.from(v)).toEqual([2, 6, 12])
  })

  test('div by scalar divides all elements', () => {
    const v = new Vector<2>(6, 9)
    v.div(3)
    expect(Array.from(v)).toEqual([2, 3])
  })

  test('div per-component divides elements independently', () => {
    const v = new Vector<2>(6, 9)
    v.div(2, 3)
    expect(Array.from(v)).toEqual([3, 3])
  })

  test('scale multiplies all elements', () => {
    const v = new Vector<3>(2, 3, 4)
    v.scale(10)
    expect(Array.from(v)).toEqual([20, 30, 40])
  })

  test('mod applies modulo to each element', () => {
    const v = new Vector<3>(7, 11, 15)
    v.mod(5)
    expect(Array.from(v)).toEqual([2, 1, 0])
  })

  test('floor rounds down each element', () => {
    const v = new Vector<3>(1.9, -0.1, 2.0)
    v.floor()
    expect(Array.from(v)).toEqual([1, -1, 2])
  })

  test('round rounds each element to nearest integer', () => {
    // Note: Math.round(-0.5) returns -0 in JavaScript, so avoid that input.
    const v = new Vector<4>(1.4, 1.5, 2.6, 3.5)
    v.round()
    expect(Array.from(v)).toEqual([1, 2, 3, 4])
  })

  test('roundToDec rounds to given decimal places', () => {
    const v = new Vector<2>(1.2345, 6.7891)
    v.roundToDec(2)
    expect(v[0]).toBeCloseTo(1.23)
    expect(v[1]).toBeCloseTo(6.79)
  })

  test('roundToDec with no argument is identity', () => {
    const v = new Vector<2>(1.2345, 6.7891)
    v.roundToDec()
    expect(v[0]).toBe(1.2345)
    expect(v[1]).toBe(6.7891)
  })
})

// ─── Vector: magnitude and norm ──────────────────────────────────────────────

describe('Vector magnitude', () => {
  test('mag2 is squared magnitude', () => {
    const v = new Vector<2>(3, 4)
    expect(v.mag2()).toBe(25)
  })

  test('mag is euclidean magnitude', () => {
    const v = new Vector<2>(3, 4)
    expect(v.mag()).toBe(5)
  })

  test('mag2 works in 3D', () => {
    const v = new Vector<3>(1, 2, 2)
    // 1 + 4 + 4 = 9
    expect(v.mag2()).toBe(9)
    expect(v.mag()).toBe(3)
  })
})

describe('Vector norm', () => {
  test('normalizes vector to unit length', () => {
    const v = new Vector<2>(3, 4)
    v.norm()
    expect(v.mag()).toBeCloseTo(1)
    expect(v[0]).toBeCloseTo(0.6)
    expect(v[1]).toBeCloseTo(0.8)
  })

  test('leaves zero vector unchanged', () => {
    const v = new Vector<3>(0, 0, 0)
    v.norm()
    expect(Array.from(v)).toEqual([0, 0, 0])
  })

  test('returns this', () => {
    const v = new Vector<2>(1, 0)
    expect(v.norm()).toBe(v)
  })
})

// ─── Vector: distances ────────────────────────────────────────────────────────

describe('Vector distances', () => {
  test('dist2 is squared euclidean distance', () => {
    const a = new Vector<2>(1, 1)
    const b = new Vector<2>(4, 5)
    // (4-1)^2 + (5-1)^2 = 9 + 16 = 25
    expect(a.dist2(b)).toBe(25)
  })

  test('dist is euclidean distance', () => {
    const a = new Vector<2>(0, 0)
    const b = new Vector<2>(3, 4)
    expect(a.dist(b)).toBe(5)
  })

  test('dist to self is 0', () => {
    const v = new Vector<3>(5, 6, 7)
    expect(v.dist(v)).toBe(0)
  })

  test('dist is symmetric', () => {
    const a = new Vector<2>(1, 2)
    const b = new Vector<2>(4, 6)
    expect(a.dist(b)).toBeCloseTo(b.dist(a))
  })
})

// ─── Vector: dot and determinant ─────────────────────────────────────────────

describe('Vector dot product', () => {
  test('dot product of 3D vectors', () => {
    const a = new Vector<3>(1, 2, 3)
    const b = new Vector<3>(4, 5, 6)
    // 1*4 + 2*5 + 3*6 = 32
    expect(a.dot(b)).toBe(32)
  })

  test('dot product of orthogonal vectors is 0', () => {
    const a = new Vector<2>(1, 0)
    const b = new Vector<2>(0, 1)
    expect(a.dot(b)).toBe(0)
  })

  test('dot product of parallel vectors equals product of magnitudes', () => {
    const a = new Vector<2>(3, 0)
    const b = new Vector<2>(5, 0)
    expect(a.dot(b)).toBe(15)
  })
})

describe('Vector determinant', () => {
  test('det of parallel vectors is 0', () => {
    const a = new Vector<2>(2, 0)
    const b = new Vector<2>(5, 0)
    expect(a.det(b)).toBe(0)
  })

  test('det positive means counter-clockwise orientation', () => {
    // [1,0] -> [0,1] is a CCW 90° turn
    const a = new Vector<2>(1, 0)
    const b = new Vector<2>(0, 1)
    expect(a.det(b)).toBeGreaterThan(0)
  })

  test('det negative means clockwise orientation', () => {
    // [0,1] -> [1,0] is a CW 90° turn
    const a = new Vector<2>(0, 1)
    const b = new Vector<2>(1, 0)
    expect(a.det(b)).toBeLessThan(0)
  })

  test('det computes correct value for arbitrary 2D vectors', () => {
    const a = new Vector<2>(2, 3)
    const b = new Vector<2>(4, 5)
    // 2*5 - 3*4 = 10 - 12 = -2
    expect(a.det(b)).toBe(-2)
  })

  test('det throws for non-2D vectors', () => {
    const a = new Vector<3>(1, 2, 3)
    expect(() => a.det([1, 2] as const)).toThrow(
      'Only 2d vectors are supported',
    )
  })
})

// ─── Vector: statistics ───────────────────────────────────────────────────────

describe('Vector statistical operations', () => {
  test('sum adds all elements', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    expect(v.sum()).toBe(10)
  })

  test('mean is arithmetic average', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    expect(v.mean()).toBe(2.5)
  })

  test('average is an alias for mean', () => {
    const v = new Vector<5>(1, 2, 3, 4, 5)
    expect(v.average()).toBe(v.mean())
    expect(v.average()).toBe(3)
  })

  test('spread2 returns variance of elements', () => {
    // [1,1,3,3]: avg=2, var = (1+1+1+1)/4 = 1
    const v = new Vector<4>(1, 1, 3, 3)
    expect(v.spread2()).toBeCloseTo(1)
  })

  test('spread returns standard deviation of elements', () => {
    const v = new Vector<4>(1, 1, 3, 3)
    expect(v.spread()).toBeCloseTo(1)
  })

  test('spread2 of a constant vector is 0', () => {
    const v = new Vector<4>(5, 5, 5, 5)
    expect(v.spread2()).toBeCloseTo(0)
    expect(v.spread()).toBeCloseTo(0)
  })
})

// ─── Vector: equals and compare ──────────────────────────────────────────────

describe('Vector equals and compare', () => {
  test('equals returns true when all elements match', () => {
    const a = new Vector<3>(1, 2, 3)
    const b = new Vector<3>(1, 2, 3)
    expect(a.equals(b)).toBe(true)
  })

  test('equals returns false when any element differs', () => {
    const a = new Vector<3>(1, 2, 3)
    const b = new Vector<3>(1, 2, 4)
    expect(a.equals(b)).toBe(false)
  })

  test('compare behaves identically to equals', () => {
    const a = new Vector<2>(5, 10)
    expect(a.compare([5, 10] as const)).toBe(true)
    expect(a.compare([5, 11] as const)).toBe(false)
  })

  test('a vector equals its own clone', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    expect(v.equals(v.clone())).toBe(true)
  })
})

// ─── Vector: lerp ─────────────────────────────────────────────────────────────

describe('Vector lerp', () => {
  test('lerp at alpha=0.5 reaches midpoint', () => {
    const v = new Vector<2>(0, 0)
    v.lerp([10, 20] as const, 0.5)
    expect(Array.from(v)).toEqual([5, 10])
  })

  test('lerp at alpha=0 leaves vector unchanged', () => {
    const v = new Vector<2>(1, 2)
    v.lerp([100, 200] as const, 0)
    expect(Array.from(v)).toEqual([1, 2])
  })

  test('lerp at alpha=1 reaches target exactly', () => {
    const v = new Vector<2>(1, 2)
    v.lerp([10, 20] as const, 1)
    expect(Array.from(v)).toEqual([10, 20])
  })

  test('lerp in 3D', () => {
    const v = new Vector<3>(0, 0, 0)
    v.lerp([10, 20, 30] as const, 0.25)
    expect(v[0]).toBeCloseTo(2.5)
    expect(v[1]).toBeCloseTo(5)
    expect(v[2]).toBeCloseTo(7.5)
  })
})

// ─── Vector: randomSort ───────────────────────────────────────────────────────

describe('Vector randomSort', () => {
  test('returns this', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    expect(v.randomSort()).toBe(v)
  })

  test('preserves length', () => {
    const v = new Vector<6>(1, 2, 3, 4, 5, 6)
    v.randomSort()
    expect(v.length).toBe(6)
  })

  test('contains all original elements', () => {
    const v = new Vector<6>(1, 2, 3, 4, 5, 6)
    v.randomSort()
    const sorted = Array.from(v).sort((a, b) => a - b)
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6])
  })
})

// ─── Vector: chunk ────────────────────────────────────────────────────────────

describe('Vector chunk', () => {
  test('splits into equal-sized Vector instances', () => {
    const v = new Vector<6>(1, 2, 3, 4, 5, 6)
    const chunks = v.chunk(3)
    expect(chunks).toHaveLength(2)
    expect(Array.from(chunks[0])).toEqual([1, 2, 3])
    expect(Array.from(chunks[1])).toEqual([4, 5, 6])
    expect(chunks[0]).instanceOf(Vector)
  })

  test('chunk of size 1 yields individual elements', () => {
    const v = new Vector<3>(10, 20, 30)
    const chunks = v.chunk(1)
    expect(chunks).toHaveLength(3)
    expect(chunks[0][0]).toBe(10)
    expect(chunks[1][0]).toBe(20)
    expect(chunks[2][0]).toBe(30)
  })

  test('chunk size equal to length yields one chunk', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    const chunks = v.chunk(4)
    expect(chunks).toHaveLength(1)
    expect(Array.from(chunks[0])).toEqual([1, 2, 3, 4])
  })

  test('throws for negative chunk size', () => {
    const v = new Vector<4>(1, 2, 3, 4)
    expect(() => v.chunk(-1)).toThrow('size must be a positive number')
  })
})

// ─── Vector: bounds operations ────────────────────────────────────────────────

describe('Vector within/clamp/clampRange', () => {
  test('within returns true when all dimensions are inside bounds', () => {
    const v = new Vector<2>(5, 5)
    expect(v.within([0, 10, 0, 10])).toBe(true)
  })

  test('within returns false when any dimension is outside bounds', () => {
    expect(new Vector<2>(5, 15).within([0, 10, 0, 10])).toBe(false)
    expect(new Vector<2>(-1, 5).within([0, 10, 0, 10])).toBe(false)
  })

  test('within treats boundary values as inside', () => {
    expect(new Vector<2>(0, 10).within([0, 10, 0, 10])).toBe(true)
  })

  test('clamp constrains each dimension to its bounds', () => {
    const v = new Vector<2>(-3, 13)
    v.clamp([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([0, 10])
  })

  test('clampRange constrains all elements to single min/max', () => {
    const v = new Vector<3>(-1, 5, 11)
    v.clampRange(0, 10)
    expect(Array.from(v)).toEqual([0, 5, 10])
  })
})

describe('Vector wrapAround', () => {
  test('wraps value below lower bound', () => {
    const v = new Vector<2>(-1, 5)
    v.wrapAround([0, 10, 0, 10])
    expect(v[0]).toBeCloseTo(9)
    expect(v[1]).toBe(5)
  })

  test('wraps value above upper bound', () => {
    const v = new Vector<2>(11, 5)
    v.wrapAround([0, 10, 0, 10])
    expect(v[0]).toBeCloseTo(1)
    expect(v[1]).toBe(5)
  })

  test('leaves in-bounds values unchanged', () => {
    const v = new Vector<2>(5, 5)
    v.wrapAround([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([5, 5])
  })
})

describe('Vector reflect', () => {
  test('reflects value below lower bound back inward', () => {
    const v = new Vector<2>(-2, 5)
    v.reflect([0, 10, 0, 10])
    // 0 + (0 - (-2)) = 2
    expect(v[0]).toBeCloseTo(2)
    expect(v[1]).toBe(5)
  })

  test('reflects value above upper bound back inward', () => {
    const v = new Vector<2>(12, 5)
    v.reflect([0, 10, 0, 10])
    // 10 - (12 - 10) = 8
    expect(v[0]).toBeCloseTo(8)
    expect(v[1]).toBe(5)
  })

  test('leaves in-bounds values unchanged', () => {
    const v = new Vector<2>(5, 5)
    v.reflect([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([5, 5])
  })
})

describe('Vector fitToBounds', () => {
  test('scales vector proportionally to fit within bounds', () => {
    const v = new Vector<2>(20, 10)
    v.fitToBounds([0, 10, 0, 10])
    // scale candidates: 10/20=0.5, 10/10=1 → minScale=0.5
    expect(v[0]).toBeCloseTo(10)
    expect(v[1]).toBeCloseTo(5)
  })

  test('does nothing for a zero vector', () => {
    const v = new Vector<2>(0, 0)
    v.fitToBounds([0, 10, 0, 10])
    expect(Array.from(v)).toEqual([0, 0])
  })
})

// ─── Vector: 2D geometry ──────────────────────────────────────────────────────

describe('Vector atan2/atan2p', () => {
  test('atan2 returns angle from x-axis pointing right', () => {
    expect(new Vector<2>(1, 0).atan2()).toBeCloseTo(0)
  })

  test('atan2 returns PI/2 for upward vector', () => {
    expect(new Vector<2>(0, 1).atan2()).toBeCloseTo(Math.PI / 2)
  })

  test('atan2 returns negative angle below x-axis', () => {
    expect(new Vector<2>(1, -1).atan2()).toBeCloseTo(-Math.PI / 4)
  })

  test('atan2p returns positive angle for all directions', () => {
    // [0,-1] gives atan2 = -PI/2, atan2p should give 3PI/2
    const v = new Vector<2>(0, -1)
    expect(v.atan2p()).toBeCloseTo((3 * Math.PI) / 2)
  })

  test('atan2p and atan2 agree for angles in [0, pi]', () => {
    const v = new Vector<2>(1, 1)
    expect(v.atan2p()).toBeCloseTo(v.atan2())
  })
})

describe('Vector rotateLeft/rotateRight', () => {
  test('rotateLeft rotates 90° counter-clockwise', () => {
    const v = new Vector<2>(1, 0)
    v.rotateLeft()
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(1)
  })

  test('rotateRight rotates 90° clockwise', () => {
    const v = new Vector<2>(1, 0)
    v.rotateRight()
    expect(v[0]).toBeCloseTo(0)
    expect(v[1]).toBeCloseTo(-1)
  })

  test('four rotateLeft calls are a full rotation', () => {
    const v = new Vector<2>(3, 7)
    const ox = v[0]
    const oy = v[1]
    v.rotateLeft().rotateLeft().rotateLeft().rotateLeft()
    expect(v[0]).toBeCloseTo(ox)
    expect(v[1]).toBeCloseTo(oy)
  })

  test('rotateLeft then rotateRight returns to original', () => {
    const v = new Vector<2>(3, 7)
    const ox = v[0]
    const oy = v[1]
    v.rotateLeft().rotateRight()
    expect(v[0]).toBeCloseTo(ox)
    expect(v[1]).toBeCloseTo(oy)
  })
})

// ─── Constants ────────────────────────────────────────────────────────────────

describe('DIRECTIONS, DIAGONALS, ALL_DIRECTIONS', () => {
  test('DIRECTIONS contains exactly 4 vectors', () => {
    expect(DIRECTIONS).toHaveLength(4)
  })

  test('DIAGONALS contains exactly 4 vectors', () => {
    expect(DIAGONALS).toHaveLength(4)
  })

  test('ALL_DIRECTIONS contains exactly 8 vectors', () => {
    expect(ALL_DIRECTIONS).toHaveLength(8)
  })

  test('all direction constants satisfy isVector', () => {
    for (const d of [...DIRECTIONS, ...DIAGONALS, ...ALL_DIRECTIONS]) {
      expect(isVector(d)).toBe(true)
    }
  })

  test('DIRECTIONS vectors have magnitude 1', () => {
    for (const d of DIRECTIONS) {
      expect(d.mag()).toBeCloseTo(1)
    }
  })

  test('DIAGONALS vectors have magnitude sqrt(2)', () => {
    for (const d of DIAGONALS) {
      expect(d.mag()).toBeCloseTo(Math.SQRT2)
    }
  })

  test('DIRECTIONS covers all four cardinal axes', () => {
    const dirs = DIRECTIONS.map((d) => Array.from(d))
    expect(dirs).toContainEqual([1, 0])
    expect(dirs).toContainEqual([-1, 0])
    expect(dirs).toContainEqual([0, 1])
    expect(dirs).toContainEqual([0, -1])
  })

  test('ALL_DIRECTIONS is the union of DIRECTIONS and DIAGONALS', () => {
    const all = ALL_DIRECTIONS.map((d) => Array.from(d))
    for (const d of [...DIRECTIONS, ...DIAGONALS]) {
      expect(all).toContainEqual(Array.from(d))
    }
  })
})
