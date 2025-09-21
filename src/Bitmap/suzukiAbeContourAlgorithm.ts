import * as Math from '../math'
import { Bitmap } from '../Bitmap'

export enum BorderType {
  /** Outer border */
  Outer,
  /** A hole (inner) border */
  Hole,
}

export interface Hierarchy {
  parent: number
  next: number
  previous: number
  firstChild: number
}

interface Result {
  // TODO(perf): store contours as chains codes (direction indices)
  contours: number[][][]
  hierarchy: number[]
  borderType: number[]
}

function print(f: number[][]) {
  console.log(f.map((r) => r.join('\t')).join('\n'))
}

/**
 * [Suzuki-Abe contour extraction algorithm](https://theailearner.com/tag/suzuki-contour-algorithm-opencv/)
 * Finds all contours (boundaries) of connected components in a bitmap
 * Returns an array of contours, where each contour is an array of points
 */
export function extractContours(bitmap: Bitmap) {
  console.log(bitmap.toPrettyString())
  // TODO: use only outer points
  const contours: number[][][] = []
  const hierarchy: number[] = []
  const borderType: number[] = []

  const f = Array.from({ length: bitmap.height }, () =>
    new Array(bitmap.width).fill(0),
  )

  // NBD
  let id = 0
  // LNBD
  let parent = 0

  for (let y = 0; y < bitmap.height; y++) {
    // reset
    parent = 0
    for (let x = 0; x < bitmap.width; x++) {
      const current = bitmap.get(x, y)

      // index in current column
      const leftPixel = x === 0 ? false : bitmap.get(x - 1, y)

      // indentifier of current pixel. Either set to active parent (>0), unassigned (=0) or ignored (<0)
      const mark = f[y][x]

      // 1.1 Outer border: current pixel is foreground and left is background and it is unassigned
      if (current && !leftPixel && f[y][x] === 0) {
        id++
        const contour = traceContour(id, bitmap, f, x, y)
        contours.push(contour)
        hierarchy.push(parent)
        borderType.push(BorderType.Outer)
        print(f)
      }
      // 1.2 Hole border: current pixel is background and left is foreground and left is assigned
      else if (!current && leftPixel && (x === 0 ? false : f[y][x - 1] > 0)) {
        id++

        // if current pixel has a parent use that. one line border still have an outer border as parent
        if (mark > 0) {
          parent = mark
        }

        const contour = traceContour(id, bitmap, f, x - 1, y)
        contours.push(contour)
        hierarchy.push(parent)
        borderType.push(BorderType.Hole)
        print(f)

        parent = id
      } else if (mark !== 0) {
        // 3.0 set parent
        parent = Math.abs(f[y][x])
      }
    }
  }

  return contours
}

/** Direction vectors for 8-connectivity (clockwise starting from right) */
const dx = [1, 1, 0, -1, -1, -1, 0, 1]
const dy = [0, 1, 1, 1, 0, -1, -1, -1]
/** Moore neighborhood boundary following */
// step 2-3
function traceContour(
  id: number,
  bitmap: Bitmap,
  f: number[][],

  // (i,j)
  x: number,
  y: number,
) {
  const contour: number[][] = []

  let dir = 0
  for (let _ = 0; _ < 8; _++) {
    let nx = x + dx[dir]
    let ny = y + dy[dir]
    if (bitmap.bounds(nx, ny) && bitmap.get(nx, ny)) {
      break
    }
    dir = (dir + 1) % 8
  }
  dir = Math.mod(dir - 1, 8)
  for (let _ = 0; _ < 8; _++) {
    let nx = x + dx[dir]
    let ny = y + dy[dir]
    if (bitmap.bounds(nx, ny) && bitmap.get(nx, ny)) {
      break
    }
    dir = Math.mod(dir - 1, 8)
  }
  let startDir = (dir + 4) % 8
  let startX = x
  let startY = y

  dir = 0
  console.log(startX, startY, startDir)

  const next = (): [number, number] | null => {
    for (let _ = 0; _ < 8; _++) {
      let nx = x + dx[dir]
      let ny = y + dy[dir]
      if (bitmap.bounds(nx, ny) && bitmap.get(nx, ny)) {
        return [nx, ny]
      }
      dir = (dir + 1) % 8
    }

    return null
  }

  while (true) {
    contour.push([x, y])

    // 2.4.1 if next to 0-pixel and not frame
    if (x + 1 < bitmap.width && !bitmap.get(x + 1, y)) {
      f[y][x] = -id
    } else if (f[y][x] === 0) {
      // 2.4.2 if unassigned, assign to current id
      f[y][x] = id
    }

    // next point
    const result = next()
    if (!result)
      break

      // Move to next point
    ;[x, y] = result

    // Terminate when we return to starting point with starting direction
    if (x === startX && y === startY && dir === startDir) {
      break
    }
    // if (x === startX && y === startY)

    // check from 90 degrees to the left
    dir = (dir + 6) % 8

    // TODO: remove safety check to prevent infinite loops
    if (contour.length > bitmap.width * bitmap.height) {
      throw Error('Contour is longer than bitmap')
    }
  }

  return contour
}

/**
 * Suzuki–Abe contour tracing (simplified)
 */
// export function extractContours(
//   image: Bitmap, // binary image: 0 = background, 1 = foreground
//   withHierarchy = true,
// ): ContourResult {
//   const height = image.height
//   const width = image.width

//   const visited = Array.from({ length: height }, () =>
//     new Array(width).fill(false),
//   )

//   const contours: Contour[] = []
//   const hierarchy: Hierarchy[] = []

//   // Moore neighborhood (8 directions, counter-clockwise)
//   const dx = [1, 1, 0, -1, -1, -1, 0, 1]
//   const dy = [0, 1, 1, 1, 0, -1, -1, -1]

//   function isInside(x: number, y: number): boolean {
//     return x >= 0 && y >= 0 && x < width && y < height
//   }

//   // Border following routine
//   function followContour(sx: number, sy: number, parent: number): number {
//     let contour: Contour = []
//     let x = sx
//     let y = sy

//     // Start by checking upward direction
//     let dir = 7 // "up-right" so that we search CCW from above

//     let first = true
//     let startX = x
//     let startY = y
//     let startDir = dir

//     do {
//       contour.push({ x, y })
//       visited[y][x] = true

//       let found = false
//       for (let i = 0; i < 8; i++) {
//         const k = (dir + i) % 8
//         const nx = x + dx[k]
//         const ny = y + dy[k]

//         if (isInside(nx, ny) && image.get(nx, ny)) {
//           x = nx
//           y = ny
//           dir = (k + 6) % 8 // turn back two steps
//           found = true
//           break
//         }
//       }
//       if (!found) break

//       if (!first && x === startX && y === startY && dir === startDir) break
//       first = false
//     } while (true)

//     // Add to contours
//     const contourIndex = contours.length
//     contours.push(contour)

//     // Maintain hierarchy
//     if (withHierarchy) {
//       hierarchy.push([-1, -1, -1, parent])
//       if (parent !== -1 && hierarchy[parent][2] === -1) {
//         hierarchy[parent][2] = contourIndex // first child
//       } else if (parent !== -1) {
//         // link as sibling
//         let prevChild = hierarchy[parent][2]
//         while (hierarchy[prevChild][0] !== -1) {
//           prevChild = hierarchy[prevChild][0]
//         }
//         hierarchy[prevChild][0] = contourIndex
//         hierarchy[contourIndex][1] = prevChild
//       }
//     }

//     return contourIndex
//   }

//   // Raster scan
//   let parent = -1
//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       // Case 1: outer border
//       if (
//         image.get(x, y) &&
//         !visited[y][x] &&
//         (x === 0 || !image.get(x - 1, y))
//       ) {
//         parent = -1
//         followContour(x, y, parent)
//       }

//       // Case 2: hole border
//       if (
//         !image.get(x, y) &&
//         x > 0 &&
//         image.get(x - 1, y) &&
//         !visited[y][x - 1]
//       ) {
//         parent = contours.length - 1 // last contour is parent
//         followContour(x - 1, y, parent)
//       }
//     }
//   }

//   return { contours, hierarchy }
// }

// type Point = { x: number; y: number }
// type Contour = Point[]
// type Hierarchy = [number, number, number, number]
// interface ContourResult {
//   contours: Contour[]
//   hierarchy: Hierarchy[]
// }
