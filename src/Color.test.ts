import { describe, expect, test } from 'vitest'
import { Color } from './Color'

describe('Color.gradient', () => {
  test('at 0 leaves the source color unchanged', () => {
    const c = Color.RED.clone()
    c.gradient(Color.GREEN, 0)
    expect(c.r).toBe(255)
    expect(c.g).toBe(0)
    expect(c.b).toBe(0)
    expect(c.a).toBe(255)
  })

  test('at 1 fully reaches the target color', () => {
    const c = Color.RED.clone()
    c.gradient(Color.GREEN, 1)
    expect(c.r).toBe(0)
    expect(c.g).toBe(255)
    expect(c.b).toBe(0)
    expect(c.a).toBe(255)
  })

  test('returns this for method chaining', () => {
    const c = Color.RED.clone()
    const result = c.gradient(Color.GREEN, 0.5)
    expect(result).toBe(c)
  })

  test('rounds each channel to an integer after interpolation', () => {
    const a = Color.create(100, 200, 50)
    const b = Color.create(101, 201, 51)
    a.gradient(b, 0.5)
    expect(Number.isInteger(a.r)).toBe(true)
    expect(Number.isInteger(a.g)).toBe(true)
    expect(Number.isInteger(a.b)).toBe(true)
    expect(Number.isInteger(a.a)).toBe(true)
  })

  test('GREEN and RED at 50% produces the midpoint (127, 127, 0)', () => {
    // lerp from GREEN (0, 255, 0) toward RED (255, 0, 0) at alpha=0.5:
    //   raw = (1 - 0.5) * 0   + 0.5 * 255 = 127.5
    //   Uint8Array truncates on write: 127.5 → 127 (before Math.round sees it)
    //   same for g: (1 - 0.5) * 255 + 0.5 * 0 = 127.5 → 127
    // Result is a yellow-olive — additive RGB blending, not paint mixing.
    const c = Color.GREEN.clone()
    c.gradient(Color.RED, 0.5)
    expect(c.r).toBe(127)
    expect(c.g).toBe(127)
    expect(c.b).toBe(0)
  })

  test('RED toward GREEN at 35% produces an orange-toned color', () => {
    // lerp from RED (255, 0, 0) toward GREEN (0, 255, 0) at alpha=0.35:
    //   raw r = (1 - 0.35) * 255 + 0.35 * 0   = 165.75 → Uint8 truncates → 165
    //   raw g = (1 - 0.35) * 0   + 0.35 * 255 = 89.25  → Uint8 truncates → 89
    //   b = 0
    // The result (165, 89, 0) sits in the burnt-orange / rust family.
    const c = Color.RED.clone()
    c.gradient(Color.GREEN, 0.35)
    expect(c.r).toBe(165)
    expect(c.g).toBe(89)
    expect(c.b).toBe(0)
    // Red channel dominates — characteristic of orange-family colours.
    expect(c.r).toBeGreaterThan(c.g)
  })

  test('interpolates alpha channel as well', () => {
    // Create two colours with different alpha values.
    const opaque = Color.create(255, 0, 0, 255)
    const transparent = Color.create(255, 0, 0, 0)
    opaque.gradient(transparent, 0.5)
    // raw alpha = (1 - 0.5) * 255 + 0.5 * 0 = 127.5 → Uint8 truncates → 127
    expect(opaque.a).toBe(127)
  })

  test('does not mutate the target color', () => {
    const target = Color.GREEN.clone()
    const before = { r: target.r, g: target.g, b: target.b, a: target.a }
    Color.RED.clone().gradient(target, 0.5)
    expect(target.r).toBe(before.r)
    expect(target.g).toBe(before.g)
    expect(target.b).toBe(before.b)
    expect(target.a).toBe(before.a)
  })
})
