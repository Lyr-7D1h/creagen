import { gaussianFilter } from './gaussianFilter'

/**
 * Canny Edge Detection Algorithm
 * @param pixeldata - RGBA pixel data
 * @param width - Image width
 * @param height - Image height
 * @param lowThresholdPercentile - Low threshold as percentile (0-100, default: 10)
 * @param highThresholdPercentile - High threshold as percentile (0-100, default: 20)
 * @param gaussianFilterRadius - Gaussian blur sigma (default: 1.4, increase to reduce noise)
 * @returns Uint8ClampedArray with edge pixels
 */
export function cannyEdgeDetection(
  pixeldata: Uint8ClampedArray,
  width: number,
  height: number,
  lowThresholdPercentile: number,
  highThresholdPercentile: number,
  gaussianFilterRadius: number,
  minComponentSize: number,
): Uint8ClampedArray {
  // Convert to grayscale for processing
  const grayscale = new Uint8ClampedArray(width * height)
  for (let i = 0; i < pixeldata.length; i += 4) {
    const pixelIndex = i / 4
    grayscale[pixelIndex] = Math.round(
      0.299 * pixeldata[i] +
        0.587 * pixeldata[i + 1] +
        0.114 * pixeldata[i + 2],
    )
  }

  // Step 1: Gaussian blur to reduce noise
  const blurred = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < grayscale.length; i++) {
    const base = i * 4
    blurred[base] = blurred[base + 1] = blurred[base + 2] = grayscale[i]
    blurred[base + 3] = 255
  }
  gaussianFilter(blurred, width, height, gaussianFilterRadius)

  // Extract grayscale from blurred result
  const blurredGray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < blurred.length; i += 4) {
    blurredGray[i / 4] = blurred[i]
  }

  // Step 2: Calculate gradients using Sobel operators
  const gradientX = new Float32Array(width * height)
  const gradientY = new Float32Array(width * height)
  const gradientMagnitude = new Float32Array(width * height)
  const gradientDirection = new Float32Array(width * height)

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      let gx = 0,
        gy = 0

      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIdx = (y + ky) * width + (x + kx)
          const kernelIdx = (ky + 1) * 3 + (kx + 1)
          const pixelValue = blurredGray[pixelIdx]

          gx += pixelValue * sobelX[kernelIdx]
          gy += pixelValue * sobelY[kernelIdx]
        }
      }

      gradientX[idx] = gx
      gradientY[idx] = gy
      gradientMagnitude[idx] = Math.sqrt(gx * gx + gy * gy)
      gradientDirection[idx] = Math.atan2(gy, gx)
    }
  }

  // Step 3: Non-maximum suppression with interpolation
  const suppressed = new Float32Array(width * height)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const angle = gradientDirection[idx]
      const magnitude = gradientMagnitude[idx]

      if (magnitude === 0) {
        suppressed[idx] = 0
        continue
      }

      if (magnitude === 0) {
        suppressed[idx] = 0
        continue
      }

      // Calculate interpolated neighbors along gradient direction
      const cos_angle = Math.cos(angle)
      const sin_angle = Math.sin(angle)

      // Points along the gradient direction
      const x1 = x - cos_angle
      const y1 = y - sin_angle
      const x2 = x + cos_angle
      const y2 = y + sin_angle

      // Bilinear interpolation for sub-pixel precision
      function interpolate(fx: number, fy: number): number {
        const ix = Math.floor(fx)
        const iy = Math.floor(fy)

        if (ix < 0 || ix >= width - 1 || iy < 0 || iy >= height - 1) {
          return 0
        }

        const dx = fx - ix
        const dy = fy - iy

        const p00 = gradientMagnitude[iy * width + ix]
        const p10 = gradientMagnitude[iy * width + (ix + 1)]
        const p01 = gradientMagnitude[(iy + 1) * width + ix]
        const p11 = gradientMagnitude[(iy + 1) * width + (ix + 1)]

        return (
          p00 * (1 - dx) * (1 - dy) +
          p10 * dx * (1 - dy) +
          p01 * (1 - dx) * dy +
          p11 * dx * dy
        )
      }

      const neighbor1 = interpolate(x1, y1)
      const neighbor2 = interpolate(x2, y2)

      // Keep pixel if it's a local maximum
      if (magnitude >= neighbor1 && magnitude >= neighbor2) {
        suppressed[idx] = magnitude
      } else {
        suppressed[idx] = 0
      }
    }
  }

  // Calculate thresholds based on percentiles of gradient magnitudes
  // First collect all non-zero gradient magnitudes
  const nonZeroMagnitudes: number[] = []
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] > 0) {
      nonZeroMagnitudes.push(suppressed[i])
    }
  }

  // Sort magnitudes for percentile calculation
  nonZeroMagnitudes.sort((a, b) => a - b)

  // Calculate percentile thresholds
  function getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, Math.min(index, values.length - 1))]
  }

  const lowThreshold = getPercentile(nonZeroMagnitudes, lowThresholdPercentile)
  const highThreshold = getPercentile(
    nonZeroMagnitudes,
    highThresholdPercentile,
  )

  // Step 4: Double thresholding and edge tracking by hysteresis
  const edges = new Uint8ClampedArray(width * height)
  const WEAK_EDGE = 75
  const STRONG_EDGE = 255

  // Apply thresholds
  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) {
      edges[i] = STRONG_EDGE
    } else if (suppressed[i] >= lowThreshold) {
      edges[i] = WEAK_EDGE
    } else {
      edges[i] = 0
    }
  }

  // Edge tracking by hysteresis
  const visited = new Uint8Array(width * height)

  function trackEdge(x: number, y: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return

    const idx = y * width + x
    if (visited[idx] || edges[idx] === 0) return

    visited[idx] = 1

    if (edges[idx] === WEAK_EDGE) {
      edges[idx] = STRONG_EDGE

      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          trackEdge(x + dx, y + dy)
        }
      }
    }
  }

  // Start tracking from strong edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (edges[idx] === STRONG_EDGE && !visited[idx]) {
        trackEdge(x, y)
      }
    }
  }

  // Remove remaining weak edges that weren't connected to strong edges
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] === WEAK_EDGE) {
      edges[i] = 0
    }
  }

  // Post-processing: Remove small isolated components (aggressive noise reduction)
  const visitedCleaning = new Uint8Array(edges.length)
  const cleaned = new Uint8ClampedArray(edges.length)

  function getConnectedComponent(startX: number, startY: number): number[] {
    const stack = [{ x: startX, y: startY }]
    const component: number[] = []

    while (stack.length > 0) {
      const { x, y } = stack.pop()!
      const idx = y * width + x

      if (
        x < 0 ||
        x >= width ||
        y < 0 ||
        y >= height ||
        visitedCleaning[idx] ||
        edges[idx] !== STRONG_EDGE
      )
        continue

      visitedCleaning[idx] = 1
      component.push(idx)

      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          stack.push({ x: x + dx, y: y + dy })
        }
      }
    }

    return component
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!visitedCleaning[idx] && edges[idx] === STRONG_EDGE) {
        const component = getConnectedComponent(x, y)

        // Keep component only if it's large enough
        if (component.length >= minComponentSize) {
          for (const pixelIdx of component) {
            cleaned[pixelIdx] = STRONG_EDGE
          }
        }
        // Small components are automatically discarded (not added to cleaned)
      }
    }
  }

  // Copy cleaned edges back
  for (let i = 0; i < edges.length; i++) {
    edges[i] = cleaned[i]
  }

  // Convert to RGBA format for output
  const result = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < edges.length; i++) {
    const base = i * 4
    result[base] = result[base + 1] = result[base + 2] = edges[i]
    result[base + 3] = 255
  }

  return result
}
