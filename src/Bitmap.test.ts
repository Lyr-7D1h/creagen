import { describe, test, expect, beforeEach } from 'vitest'
import { Bitmap } from './Bitmap'

describe('Bitmap', () => {
  describe('Creation and Basic Properties', () => {
    test('create() should create bitmap with correct dimensions', () => {
      const bitmap = Bitmap.create(10, 20)
      expect(bitmap.width).toBe(10)
      expect(bitmap.height).toBe(20)
      expect(bitmap.size()).toBe(200)
    })

    test('fromUnit8array() should create bitmap from existing data', () => {
      const data = new Uint8Array([0xff, 0x00, 0xff])
      const bitmap = Bitmap.fromUnit8array(8, 3, data)
      expect(bitmap.width).toBe(8)
      expect(bitmap.height).toBe(3)
    })

    test('clone() should create independent copy', () => {
      const original = Bitmap.create(5, 5)
      original.set(2, 2, true)

      const cloned = original.clone()
      expect(cloned.get(2, 2)).toBe(true)
      expect(cloned.width).toBe(original.width)
      expect(cloned.height).toBe(original.height)

      // Modify original, clone should remain unchanged
      original.set(1, 1, true)
      expect(cloned.get(1, 1)).toBe(false)
    })
  })

  describe('Coordinate and Index Operations', () => {
    let bitmap: Bitmap

    beforeEach(() => {
      bitmap = Bitmap.create(10, 10)
    })

    test('bounds() should correctly check coordinate boundaries', () => {
      expect(bitmap.bounds(0, 0)).toBe(true)
      expect(bitmap.bounds(9, 9)).toBe(true)
      expect(bitmap.bounds(5, 5)).toBe(true)

      expect(bitmap.bounds(-1, 0)).toBe(false)
      expect(bitmap.bounds(0, -1)).toBe(false)
      expect(bitmap.bounds(10, 0)).toBe(false)
      expect(bitmap.bounds(0, 10)).toBe(false)
      expect(bitmap.bounds(10, 10)).toBe(false)
    })

    test('_index() should compute correct bit index', () => {
      expect(bitmap.coordsToIndex(0, 0)).toBe(0)
      expect(bitmap.coordsToIndex(1, 0)).toBe(1)
      expect(bitmap.coordsToIndex(0, 1)).toBe(10)
      expect(bitmap.coordsToIndex(5, 3)).toBe(35)
    })

    test('_index() should throw for out of bounds coordinates', () => {
      expect(() => bitmap.coordsToIndex(-1, 0)).toThrow(RangeError)
      expect(() => bitmap.coordsToIndex(0, -1)).toThrow(RangeError)
      expect(() => bitmap.coordsToIndex(10, 0)).toThrow(RangeError)
      expect(() => bitmap.coordsToIndex(0, 10)).toThrow(RangeError)
    })

    test('indexToCoords() should convert index back to coordinates', () => {
      expect(bitmap.indexToCoords(0)).toEqual([0, 0])
      expect(bitmap.indexToCoords(1)).toEqual([1, 0])
      expect(bitmap.indexToCoords(10)).toEqual([0, 1])
      expect(bitmap.indexToCoords(35)).toEqual([5, 3])
    })

    test('indexToCoords() should throw for negative indices', () => {
      expect(() => bitmap.indexToCoords(-1)).toThrow()
    })
  })

  describe('Get and Set Operations', () => {
    let bitmap: Bitmap

    beforeEach(() => {
      bitmap = Bitmap.create(8, 8)
    })

    test('get() and set() should work with coordinates', () => {
      // Initially all bits should be false
      expect(bitmap.get(0, 0)).toBe(false)
      expect(bitmap.get(3, 3)).toBe(false)

      // Set some bits to true
      bitmap.set(0, 0, true)
      bitmap.set(3, 3, true)
      bitmap.set(7, 7, true)

      expect(bitmap.get(0, 0)).toBe(true)
      expect(bitmap.get(3, 3)).toBe(true)
      expect(bitmap.get(7, 7)).toBe(true)
      expect(bitmap.get(1, 1)).toBe(false)

      // Set back to false
      bitmap.set(3, 3, false)
      expect(bitmap.get(3, 3)).toBe(false)
    })

    test('getByIndex() and setByIndex() should work with indices', () => {
      const index = 20 // corresponds to (4, 2) in 8x8 grid

      expect(bitmap.getByIndex(index)).toBe(false)
      bitmap.setByIndex(index, true)
      expect(bitmap.getByIndex(index)).toBe(true)
      bitmap.setByIndex(index, false)
      expect(bitmap.getByIndex(index)).toBe(false)
    })

    test('coordinate and index methods should be consistent', () => {
      const x = 3,
        y = 2
      const index = bitmap.coordsToIndex(x, y)

      bitmap.set(x, y, true)
      expect(bitmap.getByIndex(index)).toBe(true)

      bitmap.setByIndex(index, false)
      expect(bitmap.get(x, y)).toBe(false)
    })

    test('toggle() should flip bit values', () => {
      expect(bitmap.get(2, 2)).toBe(false)
      bitmap.toggle(2, 2)
      expect(bitmap.get(2, 2)).toBe(true)
      bitmap.toggle(2, 2)
      expect(bitmap.get(2, 2)).toBe(false)
    })
  })

  describe('Iteration and Analysis', () => {
    let bitmap: Bitmap

    beforeEach(() => {
      bitmap = Bitmap.create(5, 5)
      // Create a simple pattern: cross shape
      bitmap.set(2, 1, true)
      bitmap.set(1, 2, true)
      bitmap.set(2, 2, true)
      bitmap.set(3, 2, true)
      bitmap.set(2, 3, true)
    })

    test('forEach() should iterate only over true values', () => {
      const coords: Array<[number, number]> = []
      bitmap.forEach((v, i) => {
        if (v) coords.push(bitmap.indexToCoords(i))
      })

      expect(coords).toHaveLength(5)
      expect(coords).toContainEqual([2, 1])
      expect(coords).toContainEqual([1, 2])
      expect(coords).toContainEqual([2, 2])
      expect(coords).toContainEqual([3, 2])
      expect(coords).toContainEqual([2, 3])
    })

    test('boundaryPoints() should identify edge and neighbor-adjacent points', () => {
      const boundaryPoints = bitmap.boundaryPoints()

      // All points in our cross should be boundary points since they have false neighbors
      const coordsArray = boundaryPoints.map((v) => [v.x, v.y])
      expect(coordsArray).toContainEqual([2, 1])
      expect(coordsArray).toContainEqual([1, 2])
      expect(coordsArray).toContainEqual([3, 2])
      expect(coordsArray).toContainEqual([2, 3])
    })

    test('boundaryPoints() should handle edge cases', () => {
      const edgeBitmap = Bitmap.create(3, 3)
      edgeBitmap.set(0, 0, true) // Corner
      edgeBitmap.set(1, 0, true) // Edge
      edgeBitmap.set(1, 1, true) // Center

      const boundaryPoints = edgeBitmap.boundaryPoints()
      expect(boundaryPoints.length).toBeGreaterThan(0)

      // Corner and edge points should always be boundary points
      const coords = boundaryPoints.map((v) => [v.x, v.y])
      expect(coords).toContainEqual([0, 0])
      expect(coords).toContainEqual([1, 0])
    })
  })

  describe('String Representation', () => {
    test('toPrettyString() should create readable representation', () => {
      const bitmap = Bitmap.create(3, 3)
      bitmap.set(0, 0, true)
      bitmap.set(1, 1, true)
      bitmap.set(2, 2, true)

      const result = bitmap.toPrettyString()
      const lines = result.split('\n')

      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe('#..')
      expect(lines[1]).toBe('.#.')
      expect(lines[2]).toBe('..#')
    })

    test('toPrettyString() should handle empty bitmap', () => {
      const bitmap = Bitmap.create(2, 2)
      const result = bitmap.toPrettyString()
      expect(result).toBe('..\n..')
    })

    test('toPrettyString() should handle full bitmap', () => {
      const bitmap = Bitmap.create(2, 2)
      bitmap.set(0, 0, true)
      bitmap.set(0, 1, true)
      bitmap.set(1, 0, true)
      bitmap.set(1, 1, true)

      const result = bitmap.toPrettyString()
      expect(result).toBe('##\n##')
    })
  })

  describe('Advanced Operations', () => {
    test('thin() should return a thinned bitmap', () => {
      const bitmap = Bitmap.create(5, 5)
      // Create a thick line
      bitmap.set(1, 1, true)
      bitmap.set(1, 2, true)
      bitmap.set(2, 1, true)
      bitmap.set(2, 2, true)
      bitmap.set(3, 1, true)
      bitmap.set(3, 2, true)

      const thinned = bitmap.thin()
      expect(thinned).toBeInstanceOf(Bitmap)
      expect(thinned.width).toBe(bitmap.width)
      expect(thinned.height).toBe(bitmap.height)
    })

    test('toSkeleton() should return skeleton points', () => {
      const bitmap = Bitmap.create(10, 10)
      // Create a simple shape
      for (let x = 2; x <= 7; x++) {
        for (let y = 3; y <= 6; y++) {
          bitmap.set(x, y, true)
        }
      }

      const skeleton = bitmap.toSkeleton()
      expect(Array.isArray(skeleton)).toBe(true)
      expect(skeleton.length).toBeGreaterThan(0)

      // Each point should be a [number, number] tuple
      skeleton.forEach((point) => {
        expect(point).toHaveLength(2)
        expect(typeof point[0]).toBe('number')
        expect(typeof point[1]).toBe('number')
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle minimum size bitmap', () => {
      const bitmap = Bitmap.create(1, 1)
      expect(bitmap.size()).toBe(1)
      expect(bitmap.get(0, 0)).toBe(false)
      bitmap.set(0, 0, true)
      expect(bitmap.get(0, 0)).toBe(true)
    })

    test('should handle large coordinates within bounds', () => {
      const bitmap = Bitmap.create(1000, 1000)
      bitmap.set(999, 999, true)
      expect(bitmap.get(999, 999)).toBe(true)
    })

    test('get() should throw for out of bounds access', () => {
      const bitmap = Bitmap.create(3, 3)
      expect(() => bitmap.get(-1, 0)).toThrow()
      expect(() => bitmap.get(0, -1)).toThrow()
      expect(() => bitmap.get(3, 0)).toThrow()
      expect(() => bitmap.get(0, 3)).toThrow()
    })

    test('set() should throw for out of bounds access', () => {
      const bitmap = Bitmap.create(3, 3)
      expect(() => bitmap.set(-1, 0, true)).toThrow()
      expect(() => bitmap.set(0, -1, true)).toThrow()
      expect(() => bitmap.set(3, 0, true)).toThrow()
      expect(() => bitmap.set(0, 3, true)).toThrow()
    })

    test('should handle zero-size dimensions', () => {
      // This might throw or handle gracefully depending on implementation
      expect(() => Bitmap.create(0, 0)).not.toThrow()
    })
  })

  describe('Bit Packing Verification', () => {
    test('should correctly pack bits in bytes', () => {
      const bitmap = Bitmap.create(8, 1) // Exactly one byte

      // Set all bits in first byte
      for (let i = 0; i < 8; i++) {
        bitmap.set(i, 0, true)
      }

      // Verify all are set
      for (let i = 0; i < 8; i++) {
        expect(bitmap.get(i, 0)).toBe(true)
      }
    })

    test('should handle partial byte usage', () => {
      const bitmap = Bitmap.create(3, 1) // Less than one byte
      bitmap.set(0, 0, true)
      bitmap.set(2, 0, true)

      expect(bitmap.get(0, 0)).toBe(true)
      expect(bitmap.get(1, 0)).toBe(false)
      expect(bitmap.get(2, 0)).toBe(true)
    })

    test('should handle cross-byte boundaries', () => {
      const bitmap = Bitmap.create(16, 1) // Two bytes
      bitmap.set(7, 0, true) // Last bit of first byte
      bitmap.set(8, 0, true) // First bit of second byte

      expect(bitmap.get(7, 0)).toBe(true)
      expect(bitmap.get(8, 0)).toBe(true)
      expect(bitmap.get(6, 0)).toBe(false)
      expect(bitmap.get(9, 0)).toBe(false)
    })
  })
})
