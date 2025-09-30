import { FlatBounds } from '../types'

/**
 * modififed https://observablehq.com/@techsparx/an-improvement-on-bridsons-algorithm-for-poisson-disc-samp/2 to use arbitrary bounds
 * and to return values in x, y order
 * */
export function* poissonDiscSampler(
  radius: number,
  bounds: FlatBounds<2>,
): Generator<number> {
  const k = 4 // maximum number of samples before rejection
  const radius2 = radius * radius
  const cellSize = radius * Math.SQRT1_2

  // Extract bounds: [minX, maxX, minY, maxY]
  const [minX, maxX, minY, maxY] = bounds
  const width = maxX - minX
  const height = maxY - minY

  const gridWidth = Math.ceil(width / cellSize)
  const gridHeight = Math.ceil(height / cellSize)
  // TODO(perf): use Float64Array, fill and return
  const grid = new Array(gridWidth * gridHeight)

  const queue: [number, number][] = []

  // Pick the first sample.
  const [x, y] = sample(minX + width / 2, minY + height / 2)
  yield x
  yield y

  // Pick a random existing sample from the queue.
  pick: while (queue.length) {
    const i = (Math.random() * queue.length) | 0
    const parent = queue[i]
    const seed = Math.random()
    const epsilon = 0.0000001

    // Make a new candidate.
    for (let j = 0; j < k; ++j) {
      const a = 2 * Math.PI * (seed + (1.0 * j) / k)
      const r = radius + epsilon
      const x = parent[0] + r * Math.cos(a)
      const y = parent[1] + r * Math.sin(a)

      // Accept candidates that are inside the allowed extent
      // and farther than 2 * radius to all existing samples.
      if (minX <= x && x < maxX && minY <= y && y < maxY && far(x, y)) {
        const [x1, y1] = sample(x, y)
        yield x1
        yield y1
        continue pick
      }
    }

    // If none of k candidates were accepted, remove it from the queue.
    const r = queue.pop()
    if (i < queue.length) queue[i] = r!
  }

  function far(x, y) {
    const i = ((x - minX) / cellSize) | 0
    const j = ((y - minY) / cellSize) | 0
    const i0 = Math.max(i - 2, 0)
    const j0 = Math.max(j - 2, 0)
    const i1 = Math.min(i + 3, gridWidth)
    const j1 = Math.min(j + 3, gridHeight)
    for (let j = j0; j < j1; ++j) {
      const o = j * gridWidth
      for (let i = i0; i < i1; ++i) {
        const s = grid[o + i]
        if (s) {
          const dx = s[0] - x
          const dy = s[1] - y
          if (dx * dx + dy * dy < radius2) return false
        }
      }
    }
    return true
  }

  function sample(x, y) {
    const s = (grid[
      gridWidth * (((y - minY) / cellSize) | 0) + (((x - minX) / cellSize) | 0)
    ] = [x, y]) as [number, number]
    queue.push(s)
    return s
  }
}
