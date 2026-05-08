import { describe, expect, test } from 'vitest'
import { SpatialMap } from './spatialmap'

describe('SpatialMap', () => {
  describe('nearestNeighbors', () => {
    test('finds neighbors within distance', () => {
      const width = 1000
      const height = 1000
      const spacing = 50
      const positions = [
        [100, 100], // 0
        [150, 100], // 1 - 50 units from 0
        [200, 100], // 2 - 100 units from 0
        [300, 100], // 3 - 200 units from 0
        [100, 500], // 4 - far away
      ]
      const map = new SpatialMap(width, height, spacing, positions)

      // Find neighbors within 75 units of position 0
      const neighbors = [...map.nearestNeighbors(0, 75)]

      // Should find position 1 (50 units away) but not position 2 (100 units away)
      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1) // index
      expect(neighbors[0][2]).toBeCloseTo(2500) // distance squared (50^2)
    })

    test('returns correct direction vectors', () => {
      const positions = [
        [100, 100], // 0
        [150, 100], // 1 - to the right
        [100, 150], // 2 - below
        [150, 150], // 3 - diagonal
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 100)]

      // Sort by index for predictable testing
      neighbors.sort((a, b) => a[0] - b[0])

      expect(neighbors).toHaveLength(3)

      // Position 1 - direction should be [50, 0]
      expect(neighbors[0][0]).toBe(1)
      expect(neighbors[0][1][0]).toBeCloseTo(50)
      expect(neighbors[0][1][1]).toBeCloseTo(0)

      // Position 2 - direction should be [0, 50]
      expect(neighbors[1][0]).toBe(2)
      expect(neighbors[1][1][0]).toBeCloseTo(0)
      expect(neighbors[1][1][1]).toBeCloseTo(50)

      // Position 3 - direction should be [50, 50]
      expect(neighbors[2][0]).toBe(3)
      expect(neighbors[2][1][0]).toBeCloseTo(50)
      expect(neighbors[2][1][1]).toBeCloseTo(50)
      expect(neighbors[2][2]).toBeCloseTo(5000) // 50^2 + 50^2
    })

    test('returns distance squared correctly', () => {
      const positions = [
        [0, 0],
        [3, 4], // distance = 5, distance^2 = 25
        [6, 8], // distance = 10, distance^2 = 100
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 20)]
      neighbors.sort((a, b) => a[0] - b[0])

      expect(neighbors).toHaveLength(2)
      expect(neighbors[0][2]).toBeCloseTo(25) // 3^2 + 4^2
      expect(neighbors[1][2]).toBeCloseTo(100) // 6^2 + 8^2
    })

    test('finds neighbors from arbitrary position (not in positions array)', () => {
      const positions = [
        [100, 100],
        [150, 150],
        [200, 200],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      // Query from a point not in the positions array
      const queryPoint = [125, 125]
      const neighbors = [...map.nearestNeighbors(queryPoint, 50)]

      // Should find positions 0 and 1 which are both ~35 units away
      expect(neighbors.length).toBeGreaterThan(0)

      // Verify all found neighbors are within the distance
      for (const [_idx, _dir, dist2] of neighbors) {
        expect(dist2).toBeLessThanOrEqual(50 * 50)
      }
    })

    test('handles empty results when no neighbors in range', () => {
      const positions = [
        [0, 0],
        [1000, 1000],
      ]
      const map = new SpatialMap(2000, 2000, 100, positions)

      const neighbors = [...map.nearestNeighbors(0, 100)]

      expect(neighbors).toHaveLength(0)
    })

    test('does not include the query position itself', () => {
      const positions = [
        [100, 100],
        [150, 100],
        [200, 100],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 1000)]

      // Should not include position 0 itself
      const indices = neighbors.map((n) => n[0])
      expect(indices).not.toContain(0)
      expect(indices).toContain(1)
      expect(indices).toContain(2)
    })

    test('handles positions at boundaries', () => {
      const width = 1000
      const height = 1000
      const positions = [
        [0, 0], // corner
        [width - 1, 0], // corner
        [0, height - 1], // corner
        [width - 1, height - 1], // corner
        [width / 2, height / 2], // center
      ]
      const map = new SpatialMap(width, height, 100, positions)

      // Query from center
      const neighbors = [...map.nearestNeighbors(4, 1000)]

      // Should find all corner positions
      expect(neighbors.length).toBeGreaterThan(0)
    })

    test('handles dense clustering of points', () => {
      const positions = []
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          positions.push([100 + i * 10, 100 + j * 10])
        }
      }
      const map = new SpatialMap(1000, 1000, 50, positions)

      // Query from first position with small radius
      const neighbors = [...map.nearestNeighbors(0, 25)]

      // Should find nearby positions within the grid
      expect(neighbors.length).toBeGreaterThan(0)
      expect(neighbors.length).toBeLessThan(positions.length)

      // All should be within distance
      for (const [_idx, _dir, dist2] of neighbors) {
        expect(dist2).toBeLessThanOrEqual(25 * 25)
      }
    })

    test('works with very small spacing', () => {
      const positions = [
        [50, 50],
        [60, 50],
        [70, 50],
      ]
      const map = new SpatialMap(1000, 1000, 10, positions)

      const neighbors = [...map.nearestNeighbors(0, 25)]

      expect(neighbors).toHaveLength(2)
      expect(neighbors[0][0]).toBe(1)
      expect(neighbors[1][0]).toBe(2)
    })

    test('works with large spacing', () => {
      const positions = [
        [100, 100],
        [200, 200],
        [300, 300],
      ]
      const map = new SpatialMap(1000, 1000, 200, positions)

      const neighbors = [...map.nearestNeighbors(0, 200)]

      // Should find position 1 (distance ~141)
      expect(neighbors.length).toBeGreaterThan(0)
      expect(neighbors[0][0]).toBe(1)
    })
  })

  describe('nearestNeighbors with wrapping', () => {
    test('finds neighbors across wrapped boundaries', () => {
      const width = 100
      const height = 100
      const positions = [
        [10, 50], // 0 - near left edge
        [90, 50], // 1 - near right edge (wraps to be close to 0)
        [50, 10], // 2 - near top edge
        [50, 90], // 3 - near bottom edge
      ]
      const map = new SpatialMap(width, height, 25, positions, { wrap: true })

      // Position 0 and 1 are only 20 units apart when wrapping
      const neighbors = [...map.nearestNeighbors(0, 30)]

      // Should find position 1 via wrapping
      const indices = neighbors.map((n) => n[0])
      expect(indices).toContain(1)
    })

    test('handles corner wrapping correctly', () => {
      const width = 100
      const height = 100
      const positions = [
        [5, 5], // 0 - near top-left corner
        [95, 95], // 1 - near bottom-right corner
        [95, 5], // 2 - near top-right corner
        [5, 95], // 3 - near bottom-left corner
      ]
      const map = new SpatialMap(width, height, 25, positions, { wrap: true })

      // All corners should be close to each other with wrapping
      const neighbors = [...map.nearestNeighbors(0, 20)]

      expect(neighbors.length).toBeGreaterThan(0)
    })

    test('wrapping gives correct direction vectors', () => {
      const width = 100
      const height = 100
      const positions = [
        [10, 50], // 0
        [90, 50], // 1 - wraps to be 20 units to the left
      ]
      const map = new SpatialMap(width, height, 25, positions, { wrap: true })

      const neighbors = [...map.nearestNeighbors(0, 30)]

      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1)

      // Direction should point left (negative x) due to wrapping
      expect(neighbors[0][1][0]).toBeLessThan(0)
      expect(Math.abs(neighbors[0][1][0])).toBeCloseTo(20, 0)
    })

    test('wrap vs no-wrap produces different results', () => {
      const width = 100
      const height = 100
      const positions = [
        [10, 50],
        [90, 50],
      ]

      const mapNoWrap = new SpatialMap(width, height, 25, positions, {
        wrap: false,
      })
      const mapWrap = new SpatialMap(width, height, 25, positions, {
        wrap: true,
      })

      const neighborsNoWrap = [...mapNoWrap.nearestNeighbors(0, 30)]
      const neighborsWrap = [...mapWrap.nearestNeighbors(0, 30)]

      // Without wrapping: no neighbors (80 units apart)
      expect(neighborsNoWrap).toHaveLength(0)

      // With wrapping: finds neighbor (20 units apart)
      expect(neighborsWrap).toHaveLength(1)
    })

    test('wrapping with horizontal edge', () => {
      const width = 100
      const height = 100
      const positions = [
        [5, 50],
        [96, 50],
      ]
      const map = new SpatialMap(width, height, 25, positions, { wrap: true })

      const neighbors = [...map.nearestNeighbors(0, 15)]

      // Should find position 1 (9 units away with wrapping: 5 to edge + 4 from edge)
      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1)
      expect(neighbors[0][2]).toBeCloseTo(81) // 9^2
    })

    test('wrapping with vertical edge', () => {
      const width = 100
      const height = 100
      const positions = [
        [50, 5],
        [50, 96],
      ]
      const map = new SpatialMap(width, height, 25, positions, { wrap: true })

      const neighbors = [...map.nearestNeighbors(0, 15)]

      // Should find position 1 (9 units away with wrapping)
      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1)
      expect(neighbors[0][2]).toBeCloseTo(81) // 9^2
    })
  })

  describe('nearestNeighbors with updates', () => {
    test('correctly handles position updates', () => {
      const positions = [
        [100, 100],
        [200, 100],
        [300, 100],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      // Initial query
      let neighbors = [...map.nearestNeighbors(0, 120)]
      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1)

      // Move position 2 closer to position 0
      positions[2] = [150, 100]
      map.update()

      // New query should find position 2 as well
      neighbors = [...map.nearestNeighbors(0, 120)]
      expect(neighbors).toHaveLength(2)

      const indices = neighbors.map((n) => n[0])
      expect(indices).toContain(1)
      expect(indices).toContain(2)
    })

    test('handles adding more positions', () => {
      const positions = [
        [100, 100],
        [200, 100],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      let neighbors = [...map.nearestNeighbors(0, 120)]
      expect(neighbors).toHaveLength(1)

      // Add a new position
      positions.push([150, 100])
      map.update()

      neighbors = [...map.nearestNeighbors(0, 120)]
      expect(neighbors).toHaveLength(2)
    })
  })

  describe('nearestNeighbors edge cases', () => {
    test('handles single position', () => {
      const positions = [[100, 100]]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 100)]

      // Should not find itself
      expect(neighbors).toHaveLength(0)
    })

    test('handles zero distance query', () => {
      const positions = [
        [100, 100],
        [100, 100], // Same position
        [150, 100],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 0)]

      // Should find position 1 (distance 0)
      expect(neighbors).toHaveLength(1)
      expect(neighbors[0][0]).toBe(1)
      expect(neighbors[0][2]).toBeCloseTo(0)
    })

    test('handles very large distance query', () => {
      const positions = []
      for (let i = 0; i < 20; i++) {
        positions.push([i * 100, i * 100])
      }
      const map = new SpatialMap(2000, 2000, 100, positions)

      const neighbors = [...map.nearestNeighbors(0, 10000)]

      // Should find all other positions
      expect(neighbors).toHaveLength(positions.length - 1)
    })

    test('direction vectors have correct magnitude', () => {
      const positions = [
        [0, 0],
        [30, 40], // distance = 50
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      const neighbors = [...map.nearestNeighbors(0, 100)]

      expect(neighbors).toHaveLength(1)

      const [_idx, dir, dist2] = neighbors[0]

      // Verify direction vector
      expect(dir[0]).toBeCloseTo(30)
      expect(dir[1]).toBeCloseTo(40)

      // Verify distance squared matches direction vector magnitude
      const calculatedDist2 = dir[0] * dir[0] + dir[1] * dir[1]
      expect(dist2).toBeCloseTo(calculatedDist2)
      expect(dist2).toBeCloseTo(2500) // 50^2
    })

    test('handles negative coordinates (if clamped)', () => {
      const positions = [
        [0, 0],
        [50, 50],
      ]
      const map = new SpatialMap(1000, 1000, 50, positions)

      // Query from outside bounds (should be clamped to 0,0)
      const neighbors = [...map.nearestNeighbors([-10, -10], 100)]

      expect(neighbors.length).toBeGreaterThan(0)
    })
  })

  describe('nearestNeighbors performance characteristics', () => {
    test('efficient with many positions', () => {
      // Create a grid of 1000 positions
      const positions = []
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          positions.push([i * 10, j * 10])
        }
      }
      const map = new SpatialMap(1000, 1000, 50, positions)

      const start = performance.now()
      const neighbors = [...map.nearestNeighbors(0, 50)]
      const elapsed = performance.now() - start

      // Should complete quickly (< 10ms is reasonable for 1000 positions)
      expect(elapsed).toBeLessThan(10)
      expect(neighbors.length).toBeGreaterThan(0)
    })

    test('does not iterate all positions for small radius', () => {
      // Create many positions far away
      const positions = [[100, 100]]
      for (let i = 0; i < 1000; i++) {
        positions.push([5000 + i * 10, 5000 + i * 10])
      }
      const map = new SpatialMap(10000, 10000, 100, positions)

      const neighbors = [...map.nearestNeighbors(0, 50)]

      // Should find no neighbors (all are far away)
      // If it had to check all positions, this would be slow
      expect(neighbors).toHaveLength(0)
    })
  })
})
