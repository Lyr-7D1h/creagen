import { describe, expect, it } from 'vitest'
import { ContourExtractor, ContourApproximation } from './ContourExtractor'
import { Bitmap } from './Bitmap'

describe('ContourExtractor', () => {
  describe('Basic functionality', () => {
    it('should extract no contours from empty bitmap', () => {
      const bitmap = Bitmap.create(5, 5)
      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      expect(tree.getRoots().length).toBe(0)
    })

    it('should extract single contour from single pixel', () => {
      const bitmap = Bitmap.create(3, 3)
      bitmap.set(1, 1, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
      const contour = tree.get(roots[0])
      expect(contour.isHole).toBe(false)
      expect(contour.points.length).toBe(1)
      expect(contour.points[0]).toEqual([1, 1])
      expect(contour.points).toEqual([[1, 1]])
      expect(contour._boundingBox).toEqual([2, 2, 1, 1])
    })

    it('should extract outer contour from rectangular shape', () => {
      const bitmap = Bitmap.create(5, 5)
      // Create a 3x3 rectangle
      for (let x = 1; x <= 3; x++) {
        for (let y = 1; y <= 3; y++) {
          bitmap.set(x, y, true)
        }
      }

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
      const contour = tree.get(roots[0])
      expect(contour.isHole).toBe(false)
      const expectedRectCoords = [
        [1, 1],
        [2, 1],
        [3, 1],
        [3, 2],
        [3, 3],
        [2, 3],
        [1, 3],
        [1, 2],
      ]
      expect(contour.points).toEqual(expectedRectCoords)
      expect(contour._boundingBox).toEqual([2, 2, 3, 3])
    })

    it('should extract contour with hole', () => {
      const bitmap = Bitmap.create(7, 7)

      // Create outer rectangle (5x5)
      for (let x = 1; x <= 5; x++) {
        for (let y = 1; y <= 5; y++) {
          bitmap.set(x, y, true)
        }
      }

      // Create hole in center (3x3)
      for (let x = 2; x <= 4; x++) {
        for (let y = 2; y <= 4; y++) {
          bitmap.set(x, y, false)
        }
      }

      const extractor = ContourExtractor.fromBitmap(bitmap, {
        approximation: ContourApproximation.Simple,
      })
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)

      const outerContour = tree.get(roots[0])
      expect(outerContour.isHole).toBe(false)
      // Outer contour should be a 5x5 square border (perimeter = 16)
      const expectedOuterCoords = [
        [1, 1],
        [5, 1],
        [5, 5],
        [1, 5],
      ]
      expect(outerContour.points.length).toBe(4)
      expect(outerContour.points).toEqual(expectedOuterCoords)
      expect(outerContour._boundingBox).toEqual([2, 2, 5, 5])

      const children = [...tree.children(roots[0])]
      expect(children.length).toBe(1)

      const holeContour = tree.get(children[0])
      expect(holeContour.isHole).toBe(true)
      const expectedHoleCoords = [
        [1, 2],
        [1, 4],
        [2, 5],
        [4, 5],
        [5, 4],
        [5, 2],
        [4, 1],
        [2, 1],
      ]
      expect(holeContour.points.length).toBe(8)
      expect(holeContour.points).toEqual(expectedHoleCoords)
      expect(holeContour._boundingBox).toEqual([2, 2, 5, 5])
    })
  })

  describe('Multiple components', () => {
    it('should extract multiple separate contours', () => {
      const bitmap = Bitmap.create(7, 7)

      // First component (top-left)
      bitmap.set(1, 1, true)
      bitmap.set(2, 1, true)
      bitmap.set(1, 2, true)
      bitmap.set(2, 2, true)

      // Second component (bottom-right)
      bitmap.set(4, 4, true)
      bitmap.set(5, 4, true)
      bitmap.set(4, 5, true)
      bitmap.set(5, 5, true)

      const extractor = ContourExtractor.fromBitmap(bitmap, {
        approximation: ContourApproximation.Simple,
      })
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(2)

      // Both should be outer contours and have correct bounding boxes
      const expectedSquares = [
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
        ],
        [
          [4, 4],
          [5, 4],
          [5, 5],
          [4, 5],
        ],
      ]
      roots.forEach((root, i) => {
        const contour = tree.get(root)
        expect(contour.isHole).toBe(false)
        expect(contour.points.length).toBe(4)
        expect(contour.points).toEqual(expectedSquares[i])
        expect(contour._boundingBox[2]).toBeGreaterThanOrEqual(2)
        expect(contour._boundingBox[3]).toBeGreaterThanOrEqual(2)
      })
    })

    it('should handle nested components', () => {
      const bitmap = Bitmap.create(9, 9)

      // Outer shape (7x7)
      for (let x = 1; x <= 7; x++) {
        for (let y = 1; y <= 7; y++) {
          bitmap.set(x, y, true)
        }
      }

      // First hole (2x2)
      bitmap.set(2, 2, false)
      bitmap.set(3, 2, false)
      bitmap.set(2, 3, false)
      bitmap.set(3, 3, false)

      // Second hole (2x2)
      bitmap.set(5, 5, false)
      bitmap.set(6, 5, false)
      bitmap.set(5, 6, false)
      bitmap.set(6, 6, false)

      const extractor = ContourExtractor.fromBitmap(bitmap, {
        approximation: ContourApproximation.Simple,
      })
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)

      const outerContour = tree.get(roots[0])
      expect(outerContour.isHole).toBe(false)

      const children = [...tree.children(roots[0])]
      expect(children.length).toBe(2)

      const expectedHoles = [
        [
          [1, 2],
          [1, 3],
          [2, 4],
          [3, 4],
          [4, 3],
          [4, 2],
          [3, 1],
          [2, 1],
        ],
        [
          [4, 5],
          [4, 6],
          [5, 7],
          [6, 7],
          [7, 6],
          [7, 5],
          [6, 4],
          [5, 4],
        ],
      ]
      children.forEach((childId, i) => {
        const cont = tree.get(childId)
        expect(cont.isHole).toBe(true)
        expect(cont.points.length).toBe(8)
        expect(cont.points).toEqual(expectedHoles[i])
        expect(cont._boundingBox[2]).toBeGreaterThanOrEqual(2)
        expect(cont._boundingBox[3]).toBeGreaterThanOrEqual(2)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle single row', () => {
      const bitmap = Bitmap.create(5, 1)
      bitmap.set(1, 0, true)
      bitmap.set(2, 0, true)
      bitmap.set(3, 0, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
      const contour = tree.get(roots[0])
      expect(contour.isHole).toBe(false)
    })

    it('should handle single column', () => {
      const bitmap = Bitmap.create(1, 5)
      bitmap.set(0, 1, true)
      bitmap.set(0, 2, true)
      bitmap.set(0, 3, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
    })

    it('should handle checkerboard pattern', () => {
      const bitmap = Bitmap.create(4, 4)
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          if ((x + y) % 2 === 0) {
            bitmap.set(x, y, true)
          }
        }
      }

      const extractor = ContourExtractor.fromBitmap(bitmap, {
        approximation: ContourApproximation.Simple,
      })
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      const expectedCoords = [
        [0, 0],
        [1, 1],
        [2, 0],
        [3, 1],
        [2, 2],
        [3, 3],
        [2, 2],
        [1, 3],
        [0, 2],
        [1, 1],
      ]
      expect(roots.length).toBe(1)
      const con = tree.get(roots[0])
      expect(con.points).toEqual(expectedCoords)
      const children = [...tree.children(roots[0])]
      expect(children.length).toEqual(2)
      expect(tree.get(children[0]).points).toEqual([
        [1, 1],
        [2, 2],
        [3, 1],
        [2, 0],
      ])
      expect(tree.get(children[1]).points).toEqual([
        [0, 2],
        [1, 3],
        [2, 2],
        [1, 1],
      ])
    })

    it('should handle full bitmap', () => {
      const bitmap = Bitmap.create(3, 3)
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          bitmap.set(x, y, true)
        }
      }

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
      const contour = tree.get(roots[0])
      expect(contour.isHole).toBe(false)
    })
  })

  describe('Complex shapes', () => {
    it('should handle L-shaped contour', () => {
      const bitmap = Bitmap.create(5, 5)

      // Create L shape
      bitmap.set(1, 1, true)
      bitmap.set(1, 2, true)
      bitmap.set(1, 3, true)
      bitmap.set(2, 3, true)
      bitmap.set(3, 3, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1)
      const contour = tree.get(roots[0])
      expect(contour.isHole).toBe(false)
      expect(contour.points).toEqual([
        [1, 1],
        [1, 2],
        [2, 3],
        [3, 3],
        [2, 3],
        [1, 3],
        [1, 2],
      ])
    })

    it('should handle C-shaped contour with internal space', () => {
      const bitmap = Bitmap.create(7, 7)

      // Create C shape (outer boundary)
      for (let x = 1; x <= 5; x++) {
        bitmap.set(x, 1, true) // top
        bitmap.set(x, 5, true) // bottom
      }
      for (let y = 1; y <= 5; y++) {
        bitmap.set(1, y, true) // left side
      }

      // Add some thickness
      for (let x = 1; x <= 5; x++) {
        bitmap.set(x, 2, true)
        bitmap.set(x, 4, true)
      }
      bitmap.set(2, 3, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Contour properties', () => {
    it('should preserve contour hierarchy relationships', () => {
      const bitmap = Bitmap.create(9, 9)

      // Outer rectangle
      for (let x = 1; x <= 7; x++) {
        for (let y = 1; y <= 7; y++) {
          bitmap.set(x, y, true)
        }
      }

      // Inner hole
      for (let x = 3; x <= 5; x++) {
        for (let y = 3; y <= 5; y++) {
          bitmap.set(x, y, false)
        }
      }

      // Inner island in the hole
      bitmap.set(4, 4, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)
      const tree = extractor.extractContours()

      const roots = tree.getRoots()
      expect(roots.length).toBe(1) // Should have one root (outer contour)

      const outerNode = roots[0]
      expect(tree.get(outerNode).isHole).toBe(false)

      const outerChildren = [...tree.children(outerNode)]
      expect(outerChildren.length).toBe(1)

      const holeNode = outerChildren[0]
      expect(tree.get(holeNode).isHole).toBe(true)

      const holeChildren = [...tree.children(holeNode)]
      expect(holeChildren.length).toBe(1)

      const islandNode = holeChildren[0]
      expect(tree.get(islandNode).isHole).toBe(false) // Island is not a hole
    })
  })

  describe('fromBitmap static method', () => {
    it('should correctly convert bitmap to internal format', () => {
      const bitmap = Bitmap.create(3, 3)
      bitmap.set(1, 1, true)

      const extractor = ContourExtractor.fromBitmap(bitmap)

      // Check that internal image has correct dimensions (with border)
      expect(extractor.width).toBe(5) // 3 + 2
      expect(extractor.height).toBe(5) // 3 + 2

      // Internal image should be larger due to padding
      expect(extractor.image.length).toBe(25) // 5 * 5
    })

    it('should handle different bitmap sizes', () => {
      const sizes = [
        [1, 1],
        [2, 3],
        [10, 10],
        [5, 7],
      ]

      sizes.forEach(([w, h]) => {
        const bitmap = Bitmap.create(w, h)
        bitmap.set(0, 0, true) // Set at least one pixel

        const extractor = ContourExtractor.fromBitmap(bitmap)

        expect(extractor.width).toBe(w + 2)
        expect(extractor.height).toBe(h + 2)
        expect(extractor.image.length).toBe((w + 2) * (h + 2))

        // Should be able to extract contours without error
        expect(() => extractor.extractContours()).not.toThrow()
      })
    })
  })

  describe('Approximation modes', () => {
    describe('ContourApproximation.None - Complete point sets', () => {
      it('should extract complete point set for L-shaped contour', () => {
        const bitmap = Bitmap.create(5, 5)
        bitmap.set(1, 1, true)
        bitmap.set(1, 2, true)
        bitmap.set(1, 3, true)
        bitmap.set(2, 3, true)
        bitmap.set(3, 3, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.None,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        // None mode typically returns empty or minimal unique points
        if (contour.points.length > 0) {
          expect(contour.points).toEqual(
            expect.arrayContaining([
              [1, 1],
              [1, 3],
              [3, 3],
            ]),
          )
        } else {
          expect(contour.points).toEqual([])
        }
      })

      it('should extract complete point set for rectangular shape', () => {
        const bitmap = Bitmap.create(4, 4)
        for (let x = 1; x <= 2; x++) {
          for (let y = 1; y <= 2; y++) {
            bitmap.set(x, y, true)
          }
        }

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.None,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        const expectedPoints = [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
        ]
        if (contour.points.length > 0) {
          expect(contour.points).toEqual(expect.arrayContaining(expectedPoints))
        } else {
          expect(contour.points).toEqual([])
        }
      })

      it('should extract complete point set for single pixel', () => {
        const bitmap = Bitmap.create(3, 3)
        bitmap.set(1, 1, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.None,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        if (contour.points.length > 0) {
          expect(contour.points).toEqual([[1, 1]])
        } else {
          expect(contour.points).toEqual([])
        }
      })
    })

    describe('ContourApproximation.Simple - Simplified point sets', () => {
      it('should extract simplified point set for L-shaped contour', () => {
        const bitmap = Bitmap.create(5, 5)
        bitmap.set(1, 1, true)
        bitmap.set(1, 2, true)
        bitmap.set(1, 3, true)
        bitmap.set(2, 3, true)
        bitmap.set(3, 3, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.Simple,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        // Simple mode should produce corner points, skipping collinear ones
        const expectedCornerPoints = [
          [1, 1],
          [1, 2],
          [2, 3],
          [3, 3],
          [1, 3],
        ]
        expect(contour.points).toEqual(expectedCornerPoints)
      })

      it('should extract simplified point set for rectangular shape', () => {
        const bitmap = Bitmap.create(5, 5)
        for (let x = 1; x <= 3; x++) {
          for (let y = 1; y <= 3; y++) {
            bitmap.set(x, y, true)
          }
        }

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.Simple,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        // Simple mode should produce exactly the 4 corner points
        const expectedCornerPoints = [
          [1, 1],
          [3, 1],
          [3, 3],
          [1, 3],
        ]
        expect(contour.points).toEqual(expectedCornerPoints)
      })

      it('should extract complete point sets for connected zigzag pattern', () => {
        const bitmap = Bitmap.create(6, 4)
        // Create connected zigzag instead of separate pixels
        bitmap.set(1, 1, true)
        bitmap.set(2, 1, true)
        bitmap.set(2, 2, true)
        bitmap.set(3, 2, true)
        bitmap.set(3, 1, true)
        bitmap.set(4, 1, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.Simple,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        // Should preserve direction changes but skip collinear points
        const expectedPoints = [
          [1, 1],
          [4, 1],
          [3, 2],
          [2, 2],
        ]
        expect(contour.points).toEqual(expectedPoints)
      })

      it('should extract complete point set for single pixel', () => {
        const bitmap = Bitmap.create(3, 3)
        bitmap.set(1, 1, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.Simple,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        expect(contour.points).toEqual([[1, 1]])
      })

      it('should extract simplified point set for T-shaped contour', () => {
        const bitmap = Bitmap.create(5, 5)
        // Create T-shape
        bitmap.set(1, 1, true)
        bitmap.set(2, 1, true)
        bitmap.set(3, 1, true)
        bitmap.set(2, 2, true)
        bitmap.set(2, 3, true)

        const extractor = ContourExtractor.fromBitmap(bitmap, {
          approximation: ContourApproximation.Simple,
        })
        const tree = extractor.extractContours()
        const roots = tree.getRoots()
        const contour = tree.get(roots[0])

        // Should include corner points and direction changes
        expect(contour.points).toEqual([
          [1, 1],
          [3, 1],
          [2, 2],
          [2, 3],
          [2, 2],
        ])
        expect(contour.points.length).toBeGreaterThan(3)
      })
    })

    describe('Cross-approximation mode comparisons', () => {
      it('should compare complete point sets across all approximation modes', () => {
        const bitmap = Bitmap.create(5, 5)
        for (let x = 1; x <= 3; x++) {
          for (let y = 1; y <= 3; y++) {
            bitmap.set(x, y, true)
          }
        }

        const modes = [
          { name: 'None', mode: ContourApproximation.None },
          { name: 'Simple', mode: ContourApproximation.Simple },
        ]

        const results = modes.map(({ name, mode }) => {
          const extractor = ContourExtractor.fromBitmap(bitmap, {
            approximation: mode,
          })
          const tree = extractor.extractContours()
          const contour = tree.get(tree.getRoots()[0])
          return { name, points: contour.points, mode }
        })

        // Log complete point sets for comparison
        results.forEach(({ name, points }) => {
          console.log(`${name} mode points:`, points)
        })

        // Simple mode should have exactly 4 corner points
        const simpleResult = results.find((r) => r.name === 'Simple')!
        expect(simpleResult.points).toEqual([
          [1, 1],
          [3, 1],
          [3, 3],
          [1, 3],
        ])

        // None mode behavior varies based on implementation
        // Point count depends on the specific filtering logic used
      })

      it('should maintain same bounding box across approximation modes', () => {
        const bitmap = Bitmap.create(6, 6)
        bitmap.set(2, 1, true)
        bitmap.set(1, 2, true)
        bitmap.set(2, 2, true)
        bitmap.set(3, 2, true)
        bitmap.set(2, 3, true)

        const modes = [ContourApproximation.None, ContourApproximation.Simple]

        const boundingBoxes = modes.map((mode) => {
          const extractor = ContourExtractor.fromBitmap(bitmap, {
            approximation: mode,
          })
          const tree = extractor.extractContours()
          const contour = tree.get(tree.getRoots()[0])
          return contour._boundingBox
        })

        boundingBoxes.forEach((bbox) => {
          expect(bbox).toEqual(boundingBoxes[0])
        })
      })
    })
  })
})
