import { Bitmap } from './Bitmap'
import { NodeId, Tree } from './Tree'
import { FixedNumberArray } from './types'

/** Direction vectors for 8-connectivity (clockwise starting from right) */
const DX = [1, 1, 0, -1, -1, -1, 0, 1]
const DY = [0, 1, 1, 1, 0, -1, -1, -1]

// 8-bit image masks (for future chain code implementation)
const MASK8_RIGHT = 0x80 // 1000 0000
const MASK8_NEW = 0x02 // 0000 0010
const MASK8_FLAGS = 0xfe // 1111 1110
const MASK8_BLACK = 0x01 // 0000 0001
const MASK8_LVAL = 0x7f // 0111 1111

export enum ContourApproximation {
  /** Include all points of the contour */
  None,
  /** Skip points in between the horizontal or verticle direction of two points **/
  Simple,
}

export interface ContourExtractorOpts {
  /**
   * When `true` skip points in between the horizontal or verticle direction of two points.
   *
   * Otherwise return a list of all points
   * */
  approximation: ContourApproximation
}

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

export interface ContourResult {
  // TODO(perf): store contours as chains codes (direction indices)
  contours: number[][][]
  hierarchy: number[]
  borderType: number[]
}

export type Point = [number, number]

export interface Contour {
  // TODO: use only outer points
  points: Point[]
  isHole: boolean
  /** point of origin with pixel boundary */
  _origin: Point
  /**
   * bounding box coordinates with pixel boundary
   * [x,y,w,h]
   * */
  _boundingBox: FixedNumberArray<4>
  _ctableNext: number | null
}

/**
 * [Suzuki-Abe contour extraction algorithm](https://theailearner.com/tag/suzuki-contour-algorithm-opencv/)
 * Finds all contours (boundaries) of connected components in a bitmap
 */
export class ContourExtractor {
  private tree: Tree<Contour> = Tree.create()
  /** Quick lookup table for finding contours with the same nbd label (2^7) */
  private ctable = new Array(MASK8_LVAL).fill(null)

  private offsetX = -1
  private offsetY = -1
  /**
   * Last Neigborhood Boundary Position
   *
   * index pointing to a value in `labels`
   */
  private lnbd: Point = [0, 1]
  /** Offset points because we add a 1-pixel border */
  /**
   * Neigborhood Boundary
   * 8 bit identifying number which gives the value for a coordinate per bit
   * 8765 4321
   * RIII IINB
   *
   * R - Right flag
   * V - Id value
   * N - New flag
   * B - Bit flag of the original image
   */
  private nbd: number = 2 // first two bits are taken

  static fromBitmap(bitmap: Bitmap, opts?: ContourExtractorOpts) {
    const width = bitmap.width + 2
    const height = bitmap.height + 2
    const image = new Int8Array(width * height)
    let i = width - 2
    bitmap.forEach((v, io) => {
      if (io % bitmap.width === 0) i += 2
      i++
      if (v) image[i] = 1
    })
    return new ContourExtractor(image, width, height, opts)
  }

  private constructor(
    /** Seperate label storage for boundary cooridantes */
    public image: Int8Array,
    /** Width of image + 2  1-pixel sized borders */
    public width: number,
    /** Height of image + 2  1-pixel sized borders */
    public height: number,
    public opts: ContourExtractorOpts = {
      approximation: ContourApproximation.None,
    },
  ) {}

  private print() {
    let out = ''
    for (let i = 0; i < this.image.length; i++) {
      if (i % this.width === 0) {
        out += '\n'
      }
      out += this.image[i] + '\t'
    }
  }

  /**
   * Extracts all contours (boundaries) of connected components in the bitmap
   * Returns an array of contours, where each contour is an array of points
   *
   */
  // Equivalent to `findNext()` in opencv impl https://github.com/opencv/opencv/blob/6f040337e968d17ecf2b5d92b632ac4fabe775d7/modules/imgproc/src/contours_new.cpp#L588
  extractContours() {
    this.print()
    let i
    for (let y = 1; y < this.height - 1; y++) {
      let prev = 0
      this.lnbd = [0, y]
      // TODO(perf): only do additions to index
      i = y * this.width + 1

      for (let x = 1; x < this.width - 1; x++, i++) {
        let current //= this.image[i]

        // optimization to skip x's if they are the same
        for (
          ;
          x < this.width - 1 && (current = this.image[i]) === prev;
          x++, i++
        ) {}
        if (x >= this.width) {
          continue
        }
        // i = this.coordsToIndex(x, y)

        let isHole = false
        if (!(prev === 0 && current === 1)) {
          // not background-foreground
          if (current !== 0 || prev < 1) {
            // skip if not a start of a boundary
            prev = current
            // set last neighborhood boundary if it has any flags
            if (prev & MASK8_FLAGS) {
              this.lnbd[0] = x
            }
            continue
          }

          // Hole condition prev >= 1 and p == 0
          if (prev & MASK8_FLAGS) {
            // go back one more if prev was marked
            if (this.lnbd) this.lnbd[0] = x - 1
          }
          isHole = true
        }

        const lval = this.image[this.coordsToIndex(...this.lnbd)]! & MASK8_LVAL
        let parent = this.findFirstBoundingContour(y, lval)

        // if current contour is a hole and previous contour is a hole or
        // current contour is external and previous contour is external then
        // the parent of the contour is the parent of the previous contour else
        // the parent is the previous contour itself.
        if (parent) {
          let parentNode = this.tree.get(parent)
          if (parentNode.isHole === isHole) {
            if (this.tree.getParent(parent) !== null) {
              parent = parent
            }
          }
        }

        // parent should always the other kind of boundary then child
        if (CREAGEN_ASSERTS) {
          if (parent) {
            const node = this.tree.get(parent)
            console.assert(node.isHole != isHole)
          }
        }

        const start = [x - (isHole ? 1 : 0), y] as Point
        // set the last visisted
        this.lnbd[0] = start[0]
        const id = this.makeContour(isHole, start)
        if (CREAGEN_ASSERTS) console.assert(id > 0)

        if (parent !== null) this.tree.addChild(parent, id)

        prev = this.image[i]
      }
    }

    return this.tree
  }

  /** Find which of the borders from `ctable` is the parent of current */
  private findFirstBoundingContour(y: number, lval: number) {
    const [lx, ly] = this.lnbd
    let res: number | null = null
    let cur: number | null = this.ctable[lval]

    while (cur !== null) {
      const el = this.tree.get(cur)
      const [bx, by, bw, bh] = el._boundingBox
      if (lx - bx < bw && ly - by < bh) {
        // if more than two fit check if it fits in the inserted later (the smaller one)
        if (res !== null) {
          const resElem = this.tree.get(res)
          const origin = resElem._origin
          const isHole = resElem.isHole
          if (this.hitsContourTrace(origin, [lx, y], isHole)) {
            break
          }
        }
        res = cur
      }
      cur = el._ctableNext
    }
    return res as NodeId<Contour> | null
  }

  private getIndexDelta(dir: number) {
    if (CREAGEN_ASSERTS) console.assert(dir >= 0 && dir < 16)
    dir = dir % 8
    return DX[dir] + DY[dir] * this.width
  }

  private coordsToIndex(x: number, y: number) {
    if (CREAGEN_ASSERTS) console.assert(x > 0 && x < this.width)
    if (CREAGEN_ASSERTS) console.assert(y > 0 && y < this.height)
    return x + this.width * y
  }
  private checkValue(i: number) {
    return this.image[i] !== 0
  }
  private isRight(i: number) {
    return (this.image[i] & MASK8_RIGHT) !== 0
  }

  /**
   * Check which of the nested boundaries that pass the bounding box test are valid
   *
   * Check if a point is contained within
   */
  private hitsContourTrace(
    start: Point,
    // end point of the trace from origin to start
    end: Point,
    isHole: boolean,
  ): boolean {
    const stopPtr = this.coordsToIndex(end[0], end[1])
    let i0 = this.coordsToIndex(start[0], start[1])
    let i1: number,
      i3: number,
      i4: number = -1
    const sEnd = isHole ? 0 : 4

    // get initial direction
    let s = sEnd
    do {
      s = (s - 1) & 7
      i1 = i0 + this.getIndexDelta(s)
    } while (!this.checkValue(i1) && s !== sEnd)

    i3 = i0

    // Check single pixel domain
    if (s !== sEnd) {
      // Follow border
      while (true) {
        if (CREAGEN_ASSERTS) console.assert(i3 !== -1)
        if (CREAGEN_ASSERTS) console.assert(s < 15 && s > 0)
        // maximum is for s=7  ; 7 + 8
        while (s < 15) {
          s++
          i4 = i3 + this.getIndexDelta(s)
          if (CREAGEN_ASSERTS) console.assert(i4 !== -1)
          if (this.checkValue(i4)) {
            break
          }
        }

        if (i3 === stopPtr) {
          if (!this.isRight(i3)) {
            // It's the only contour
            return true
          }

          // Check if this is the last contour
          let i5: number
          let t = s
          while (true) {
            t = (t - 1) & 7
            i5 = i3 + this.getIndexDelta(t)
            if (this.image[i5] !== 0) {
              break
            }
            if (t === 0) {
              return true
            }
          }
        }

        if (i4 === i0 && i3 === i1) {
          break
        }

        i3 = i4
        s = (s + 4) & 7
      }
    } else {
      return i3 === stopPtr
    }

    return false
  }

  private makeContour(isHole: boolean, start: Point) {
    // increase current nbd
    this.nbd = (this.nbd + 1) % MASK8_LVAL
    if (this.nbd == 0) this.nbd = MASK8_BLACK | MASK8_NEW

    const lval = this.nbd

    // translated point
    const point = [start[0] + this.offsetX, start[1] + this.offsetY] as Point
    // translated bounding box
    const rect: FixedNumberArray<4> = [point[0], point[1], point[0], point[1]]
    const points = []
    this.makeContourTrace(start, isHole, point, rect, points)

    this.print()

    // translate rect back
    rect[0] -= this.offsetX
    rect[1] -= this.offsetY

    const node = this.tree.new({
      points,
      isHole,
      _origin: start,
      _boundingBox: rect,
      _ctableNext: this.ctable[lval],
    })

    this.ctable[lval] = node

    return node
  }

  private setRightFlag(i: number) {
    this.image[i] = this.nbd | MASK8_RIGHT
  }

  private setNewFlag(i: number) {
    this.image[i] = this.nbd
  }

  private isValue(i: number) {
    return this.image[i] === MASK8_BLACK
  }

  private makeContourTrace(
    start: Point,
    isHole: boolean,
    // following are in translated space (without the 1-pixel border)
    point: Point,
    rect: FixedNumberArray<4>,
    points: Point[],
  ) {
    const i0 = this.coordsToIndex(...start)
    let i1: number,
      i3: number,
      i4: number = -1
    const sEnd = isHole ? 0 : 4
    let s = sEnd

    do {
      s = (s - 1) & 7
      i1 = i0 + this.getIndexDelta(s)
    } while (!this.checkValue(i1) && s !== sEnd)

    if (s === sEnd) {
      this.setRightFlag(i0)
      points.push([...point])
    } else {
      i3 = i0
      let prevS = s ^ 4

      // Follow border
      while (true) {
        const sEndLoop = s
        if (CREAGEN_ASSERTS) console.assert(s < 15 && s > 0)
        while (s < 15) {
          ++s
          i4 = i3 + this.getIndexDelta(s)
          if (CREAGEN_ASSERTS) console.assert(i4 >= 0)
          if (this.checkValue(i4)) {
            break
          }
        }
        s &= 7

        if (this.opts.approximation === ContourApproximation.None) {
          points.push([...point])
        } else if (
          this.opts.approximation === ContourApproximation.Simple &&
          s !== prevS
        ) {
          points.push([...point])
        }

        // Check "right" bound
        if ((s - 1) >>> 0 < sEndLoop) {
          this.setRightFlag(i3)
        } else if (this.isValue(i3)) {
          this.setNewFlag(i3)
        }

        if (s !== prevS) {
          // Update bounds
          if (point[0] < rect[0]) {
            rect[0] = point[0]
          } else if (point[0] > rect[2]) {
            rect[2] = point[0]
          }

          if (point[1] < rect[1]) {
            rect[1] = point[1]
          } else if (point[1] > rect[3]) {
            rect[3] = point[1]
          }
        }

        prevS = s
        point[0] += DX[s]
        point[1] += DY[s]

        if (i4 === i0 && i3 === i1) {
          break
        }

        i3 = i4
        s = (s + 4) & 7
      }
    }

    rect[2] -= rect[0] - 1
    rect[3] -= rect[1] - 1
    return points
  }
}
