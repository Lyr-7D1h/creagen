/**
 * Horizontal gradient
 *
 * [-1, 0, +1]   [1]
 * [-2, 0, +2] × [2]  = Weighted difference between left and right columns
 * [-1, 0, +1]   [1]
 */
function conv3x(data, i, w, m) {
  // Check bounds to prevent wrap-around
  if (i - w - 4 < 0 || i + w + 4 >= data.length) return 0

  return (
    m[0] * data[i - w - 4] +
    m[1] * data[i - 4] +
    m[2] * data[i + w - 4] -
    m[0] * data[i - w + 4] -
    m[1] * data[i + 4] -
    m[2] * data[i + w + 4]
  )
}

/**
 * Vertical gradient
 *
 * [-1, -2, -1]
 * [ 0,  0,  0] × [1, 2, 1] = Weighted difference between top and bottom rows
 * [+1, +2, +1]
 */
function conv3y(data, i, w, m) {
  // Check bounds to prevent wrap-around
  if (i - w - 4 < 0 || i + w + 4 >= data.length) return 0

  return (
    m[0] * data[i - w - 4] +
    m[1] * data[i - w] +
    m[2] * data[i - w + 4] -
    (m[0] * data[i + w - 4] + m[1] * data[i + w] + m[2] * data[i + w + 4])
  )
}

/**
 * Apply the [Sobel Operator](https://en.wikipedia.org/wiki/Sobel_operator) on an image
 * for getting pixels with highly varying neighbors
 * @param pixeldata - Object of image parameters
 * @param
 */
export function sobelGradient(pixeldata: Uint8ClampedArray, width: number) {
  // mask - gradient operator e.g. Prewitt, Sobel, Scharr, etc.
  // cosnt mask = [1,1,1] // prewitt
  const mask = [1, 2, 1] // sobel
  var w = width * 4
  var l = pixeldata.length - w - 4
  var edges = new Uint8ClampedArray(pixeldata.length)

  // Start from row 1 and end at row height-2 to avoid edge wrap-around
  for (var i = w + 4; i < l; i += 4) {
    // Additional check to ensure we're not at the left or right edge
    const col = (i / 4) % width
    if (col === 0 || col === width - 1) {
      edges[i] = edges[i + 1] = edges[i + 2] = 0
      edges[i + 3] = 255
      continue
    }

    var dx = conv3x(pixeldata, i, w, mask)
    var dy = conv3y(pixeldata, i, w, mask)
    edges[i] = edges[i + 1] = edges[i + 2] = Math.sqrt(dx * dx + dy * dy)
    edges[i + 3] = 255
  }
  return edges
}
