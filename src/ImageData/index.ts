import { Color } from '../Color'
import { Vector } from '../Vector'
import { Bitmap } from '../Bitmap'
import loadCV, { Mat } from '@techstark/opencv-js'

/**
 * Morphological operations for image processing
 * @see https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html
 */
export enum MorphologyOperation {
  /** Erode - shrinks bright regions, removes small white noise */
  ERODE = 0,
  /** Dilate - expands bright regions, fills small holes */
  DILATE = 1,
  /** Opening - erosion followed by dilation, removes small bright noise while preserving shape */
  OPEN = 2,
  /** Closing - dilation followed by erosion, fills small dark holes while preserving shape */
  CLOSE = 3,
  /** Morphological gradient - difference between dilation and erosion, outlines objects */
  GRADIENT = 4,
  /** Top hat - difference between input and opening, extracts small bright elements */
  TOPHAT = 5,
  /** Black hat - difference between closing and input, extracts small dark elements */
  BLACKHAT = 6,
  /** Hit-or-miss transform - finds specific patterns in binary images */
  HITMISS = 7,
}

/**
 * Structuring element shapes for morphological operations
 */
export enum MorphologyShape {
  /** Rectangular structuring element */
  RECT = 0,
  /** Cross-shaped structuring element (+ shape) */
  CROSS = 1,
  /** Elliptical/circular structuring element (smoothest) */
  ELLIPSE = 2,
}

/**
 * Threshold types for image binarization
 * @see https://docs.opencv.org/4.x/d7/d4d/tutorial_py_thresholding.html
 */
export enum ThresholdType {
  /** Binary threshold: pixel > threshold ? 255 : 0 */
  BINARY = 0,
  /** Binary inverse threshold: pixel > threshold ? 0 : 255 */
  BINARY_INV = 1,
  /** Truncate threshold: pixel > threshold ? threshold : pixel (caps values) */
  TRUNC = 2,
  /** To zero threshold: pixel > threshold ? pixel : 0 (removes low values) */
  TOZERO = 3,
  /** To zero inverse threshold: pixel > threshold ? 0 : pixel (removes high values) */
  TOZERO_INV = 4,
  /** Otsu's method: automatically determines optimal threshold using histogram */
  OTSU = 8,
  /** Triangle method: automatically determines threshold using triangle algorithm */
  TRIANGLE = 16,
}

// TODO(perf): calculate image processing in a worker https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
let cv: typeof import('@techstark/opencv-js') = loadCV
export class ImageData {
  private pixeldata: Uint8ClampedArray
  private readonly mat: Mat

  static async create(src: string) {
    if (cv instanceof Promise) cv = await cv
    const img = new globalThis.Image()
    img.src = src
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        resolve()
      }
      img.onerror = (e) => {
        reject(`Failed to load image: ${e}`)
      }
    })
    return new ImageData(img)
  }

  /** @param src url or base64 string with image data */
  private constructor(public img: HTMLImageElement) {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    this.pixeldata = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // Initialize mat lazily when needed
    this.mat = cv.matFromImageData({
      data: this.pixeldata,
      width: canvas.width,
      height: canvas.height,
    })
  }

  get width() {
    return this.img.width
  }

  get height() {
    return this.img.height
  }

  /** Get the count of amount of pixels (rgba values) in Image */
  get pixelCount() {
    return this.pixeldata.length / 4
  }

  clone(): ImageData {
    // Create the cloned ImageData instance
    const cloned = Object.create(ImageData.prototype)

    const clonedImg = new globalThis.Image()
    clonedImg.width = this.width
    clonedImg.height = this.height
    cloned.img = clonedImg

    cloned.pixeldata = new Uint8ClampedArray(this.pixeldata)

    cloned.mat = cv.matFromImageData({
      data: cloned.pixeldata,
      width: this.width,
      height: this.height,
    })

    return cloned
  }

  /** Convert an index to the Uint8ClampedArray pixel array to coordinates in the image, top left corner being [0,0]  */
  indexToCoords(i: number): [number, number] {
    i = Math.floor(i / 4)
    return [i % this.width, Math.floor(i / this.width)]
  }

  get(x: number, y: number): Color
  get(p: Vector<2>): Color
  /**
   * Get a section of the image as `Uint8ClampedArray[]` for efficient representation
   *
   * Gives all pixels in between two points
   * */
  get(x: number, y: number, x2: number, y2: number): Uint8ClampedArray[]
  /**
   * Get a section of the image as `Uint8ClampedArray[]` for efficient representation
   *
   * Gives all pixels in between two points
   * */
  get(p: Vector<2>, p2: Vector<2>): Uint8ClampedArray[]
  get(
    x: number | Vector<2>,
    y?: number | Vector<2>,
    x2?: number,
    y2?: number,
  ): Uint8ClampedArray | Uint8ClampedArray[] | Color {
    if (x instanceof Vector) {
      if (y instanceof Vector) return this.get(x.x, x.y, y.x, y.y)
      return this.get(x.x, x.y)
    }
    y = y as number

    if (x < 0 || x >= this.width) {
      throw Error(`x '${x}' is out of bounds`)
    }
    if (y < 0 || y >= this.height) {
      throw Error(`y '${y}' is out of bounds`)
    }

    if (typeof x2 !== 'undefined' && typeof y2 !== 'undefined') {
      if (x2 < 0 || x2 >= this.width) {
        throw Error(`x '${x2}' is out of bounds`)
      }
      if (y2 < 0 || y2 >= this.height) {
        throw Error(`y '${y2}' is out of bounds`)
      }

      let minX = x
      let maxX = x2
      if (maxX < minX) {
        minX = x2
        maxX = x
      }
      let minY = y
      let maxY = y2
      if (maxY < minY) {
        minY = y2
        maxY = y
      }

      const width = this.width * 4
      const r = new Array(maxY - minY)
      let i = 0

      for (let o = minY * width; o <= maxY * width; o += width) {
        r[i] = this.pixeldata.slice(o + minX * 4, o + maxX * 4)
        i++
      }
      return r
    }

    const width = this.width
    const i = y * width * 4 + x * 4
    return Color.create(this.pixeldata.slice(i, i + 4))
  }

  async html() {
    // if custom pixeldata transform it to image
    if (this.pixeldata.length > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = this.width
      canvas.height = this.height
      const ctx = canvas.getContext('2d')!

      // Create ImageData from our pixel data
      const imageData = ctx.createImageData(this.width, this.height)
      imageData.data.set(this.pixeldata)

      ctx.putImageData(imageData, 0, 0)
      const dataUrl = canvas.toDataURL('image/png')

      // Properly wait for the data URL to load
      await new Promise<void>((resolve, reject) => {
        if (this.img.src === dataUrl && this.img.complete) {
          resolve()
        } else {
          this.img.onload = () => resolve()
          this.img.onerror = (e) => reject(e)
          this.img.src = dataUrl
        }
      })
    }
    return this.img
  }

  /**
   * Iterate over each pixel in the image
   * @param callback Function called for each pixel with (color, x, y, index)
   */
  forEach(callback: (color: Color, startIndex: number) => void): ImageData {
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      callback(Color.create(this.pixeldata.slice(i, i + 4)), i)
    }
    return this
  }

  /**
   * Convert image to bitmap based on luminance threshold
   * @param threshold Luminance threshold value (min: 0, max: 255, default: 255, pixels above threshold become white)
   */
  toBitmap(threshold: number = 255) {
    const bitmap = Bitmap.create(this.width, this.height)
    if (threshold === 255) {
      let i = 0
      this.forEach((c) => {
        if (c.r === 255 && c.b === 255 && c.g === 255)
          bitmap.setByIndex(i, true)
        i++
      })
    } else {
      let i = 0
      this.forEach((c) => {
        if (c.luminance() > threshold) bitmap.setByIndex(i, true)
        i++
      })
    }
    return bitmap
  }

  /**
   * Scale (resize) the image
   * @param factor Scale factor (e.g., 2 = double size, 0.5 = half size) OR target width
   * @param height Optional target height (if first param is width). If omitted and factor is provided, scales proportionally
   * @param interpolation OpenCV interpolation method (default: cv.INTER_LINEAR)
   * @returns The modified ImageData instance
   */
  scale(
    factor: number,
    height?: number,
    interpolation: number = cv.INTER_LINEAR,
  ): ImageData {
    let newWidth: number
    let newHeight: number

    if (typeof height !== 'undefined') {
      // Interpret as (width, height)
      newWidth = Math.floor(factor)
      newHeight = Math.floor(height)
    } else {
      // Interpret as scale factor
      newWidth = Math.floor(this.width * factor)
      newHeight = Math.floor(this.height * factor)
    }

    // Ensure dimensions are at least 1
    newWidth = Math.max(1, newWidth)
    newHeight = Math.max(1, newHeight)

    const dsize = new cv.Size(newWidth, newHeight)
    const resized = new cv.Mat()

    try {
      cv.resize(this.mat, resized, dsize, 0, 0, interpolation)

      // Update internal mat
      this.mat.delete()
      Object.defineProperty(this, 'mat', {
        value: resized,
        writable: true,
        enumerable: false,
        configurable: true,
      })

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(resized.data)

      // Update img dimensions
      this.img.width = newWidth
      this.img.height = newHeight
    } catch (e) {
      resized.delete()
      throw e
    }

    return this
  }

  /**
   * Adjust brightness of the image
   * @param percentage Brightness multiplier (min: 0, max: 3.0, default: 1.0 = no change, >1.0 = brighter, <1.0 = darker)
   */
  brightness(percentage: number): ImageData {
    percentage = Math.max(0, Math.min(3.0, percentage))

    // Use convertTo: dst = src * alpha + beta
    // For brightness: dst = src * percentage
    this.mat.convertTo(this.mat, -1, percentage, 0)

    // Update pixeldata
    this.pixeldata = new Uint8ClampedArray(this.mat.data)

    return this
  }

  /**
   * Apply horizontal gradient to the image
   * @param startPercentage Starting brightness factor at top (min: 0, max: 1.0)
   * @param endPercentage Ending brightness factor at bottom (min: 0, max: 1.0)
   */
  horizontalGradient(
    startPercentage: number,
    endPercentage: number,
  ): ImageData {
    // Create a gradient mask using OpenCV
    const gradient = new cv.Mat(this.height, this.width, cv.CV_32FC1)

    try {
      // Fill gradient values
      for (let y = 0; y < this.height; y++) {
        const factor =
          startPercentage +
          ((endPercentage - startPercentage) * y) / this.height
        for (let x = 0; x < this.width; x++) {
          gradient.floatPtr(y, x)[0] = factor
        }
      }

      // Convert mat to float for multiplication
      const floatMat = new cv.Mat()
      this.mat.convertTo(floatMat, cv.CV_32F)

      // Split into channels
      const channels = new cv.MatVector()
      cv.split(floatMat, channels)

      // Apply gradient to RGB channels only
      for (let i = 0; i < 3; i++) {
        const channel = channels.get(i)
        cv.multiply(channel, gradient, channel)
      }

      // Merge back
      cv.merge(channels, floatMat)

      // Convert back to 8-bit
      floatMat.convertTo(this.mat, cv.CV_8U)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)

      // Cleanup
      channels.delete()
      floatMat.delete()
    } finally {
      gradient.delete()
    }

    return this
  }

  greyscale(): ImageData {
    const grayMat = new cv.Mat()

    try {
      cv.cvtColor(this.mat, grayMat, cv.COLOR_RGBA2GRAY)

      // Convert back to RGBA format for consistency (gray value in all channels)
      cv.cvtColor(grayMat, this.mat, cv.COLOR_GRAY2RGBA)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      grayMat.delete()
    }

    return this
  }

  /**
   * Apply contrast to image making color tend toward middle gray (128)
   * or more towards the outer ends (0, 255)
   *
   * @param factor Contrast multiplier (min: 0.1, max: 3.0, default: 1.0 = no change, >1.0 = increased contrast, <1.0 = decreased contrast)
   */
  contrast(factor: number): ImageData {
    factor = Math.max(0.1, Math.min(3.0, factor))

    // Use OpenCV's convertTo for contrast adjustment
    // formula: dst = src * alpha + beta
    // For contrast around 128: dst = (src - 128) * factor + 128
    // We want: (src - 128) * factor + 128 = src * factor - 128 * factor + 128
    const beta = 128 * (1 - factor)
    this.mat.convertTo(this.mat, -1, factor, beta)

    // Update pixeldata
    this.pixeldata = new Uint8ClampedArray(this.mat.data)

    return this
  }

  /**
   * Invert the colors of the image (negative effect)
   * Each RGB channel is inverted: newValue = 255 - oldValue
   */
  invert(): ImageData {
    const temp = new cv.Mat()

    try {
      // Use OpenCV's bitwise_not for inversion
      // This inverts all channels including alpha, so we need to handle alpha separately
      cv.bitwise_not(this.mat, temp)

      // Restore original alpha channel
      const channels = new cv.MatVector()
      cv.split(temp, channels)
      const alphaChannel = new cv.MatVector()
      cv.split(this.mat, alphaChannel)

      // Replace inverted alpha with original alpha
      const mergedChannels = new cv.MatVector()
      mergedChannels.push_back(channels.get(0)) // Inverted R
      mergedChannels.push_back(channels.get(1)) // Inverted G
      mergedChannels.push_back(channels.get(2)) // Inverted B
      mergedChannels.push_back(alphaChannel.get(3)) // Original A

      cv.merge(mergedChannels, this.mat)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)

      // Cleanup
      channels.delete()
      alphaChannel.delete()
      mergedChannels.delete()
    } finally {
      temp.delete()
    }

    return this
  }

  /**
   * Apply Gaussian blur to the image
   * @param kernelSize Size of the Gaussian kernel (min: 1, typical: 3-15, default: 5, must be odd, will be adjusted if even)
   * @param sigma Standard deviation of the Gaussian kernel (min: 0, default: 0, 0 = auto-calculated from kernel size)
   */
  blur(kernelSize: number = 5, sigma: number = 0): ImageData {
    kernelSize = kernelSize % 2 === 0 ? kernelSize + 1 : kernelSize

    cv.GaussianBlur(
      this.mat,
      this.mat,
      new cv.Size(kernelSize, kernelSize),
      sigma,
    )

    // Update pixeldata
    this.pixeldata = new Uint8ClampedArray(this.mat.data)

    return this
  }

  /**
   * Apply Sobel edge detection to the image
   * @param dx Order of derivative in x direction (0, 1, or 2, default: 1)
   * @param dy Order of derivative in y direction (0, 1, or 2, default: 1)
   * @param kernelSize Size of the Sobel kernel (1, 3, 5, or 7, default: 3)
   * @returns The modified ImageData instance
   * @see https://docs.opencv.org/4.x/d4/d86/group__imgproc__filter.html#gacea54f142e81b6758cb6f375ce782c8d
   */
  sobel(dx: number = 1, dy: number = 1, kernelSize: number = 3): ImageData {
    // Validate parameters
    dx = Math.max(0, Math.min(2, dx))
    dy = Math.max(0, Math.min(2, dy))
    if (![1, 3, 5, 7].includes(kernelSize)) {
      kernelSize = 3
    }

    // At least one derivative must be non-zero
    if (dx === 0 && dy === 0) {
      dx = 1
      dy = 1
    }

    const gray = new cv.Mat()
    const gradX = new cv.Mat()
    const gradY = new cv.Mat()
    const absGradX = new cv.Mat()
    const absGradY = new cv.Mat()
    const grad = new cv.Mat()

    try {
      // Convert to grayscale first
      cv.cvtColor(this.mat, gray, cv.COLOR_RGBA2GRAY)

      if (dx > 0 && dy > 0) {
        // Compute gradients in both directions
        cv.Sobel(gray, gradX, cv.CV_16S, dx, 0, kernelSize)
        cv.Sobel(gray, gradY, cv.CV_16S, 0, dy, kernelSize)

        // Convert to absolute values
        cv.convertScaleAbs(gradX, absGradX)
        cv.convertScaleAbs(gradY, absGradY)

        // Combine gradients: |G| = |Gx| + |Gy| (approximation of sqrt(Gx^2 + Gy^2))
        cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, grad)
      } else if (dx > 0) {
        // Only x direction
        cv.Sobel(gray, gradX, cv.CV_16S, dx, 0, kernelSize)
        cv.convertScaleAbs(gradX, grad)
      } else {
        // Only y direction
        cv.Sobel(gray, gradY, cv.CV_16S, 0, dy, kernelSize)
        cv.convertScaleAbs(gradY, grad)
      }

      // Convert back to RGBA
      cv.cvtColor(grad, this.mat, cv.COLOR_GRAY2RGBA)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      gray.delete()
      gradX.delete()
      gradY.delete()
      absGradX.delete()
      absGradY.delete()
      grad.delete()
    }

    return this
  }

  /**
   * Apply threshold to create a binary image
   * @param threshold Threshold value (min: 0, max: 255, default: 127)
   * @param type Threshold type (default: ThresholdType.BINARY, see ThresholdType enum)
   */
  threshold(
    threshold: number = 127,
    type: ThresholdType = ThresholdType.BINARY,
  ): ImageData {
    const gray = new cv.Mat()

    try {
      // Convert to grayscale first
      cv.cvtColor(this.mat, gray, cv.COLOR_RGBA2GRAY)

      // Apply threshold (reuse gray as both src and dst)
      cv.threshold(gray, gray, threshold, 255, type)

      // Convert back to RGBA directly to this.mat
      cv.cvtColor(gray, this.mat, cv.COLOR_GRAY2RGBA)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      gray.delete()
    }

    return this
  }

  /**
   * Apply Canny edge detection
   * @param lowThreshold Lower threshold for edge detection (min: 0, max: 255, typical: 50-100, default: 50)
   * @param highThreshold Upper threshold for edge detection (min: 0, max: 255, typical: 100-200, default: 150, should be 2-3x lowThreshold)
   */
  canny(lowThreshold: number = 50, highThreshold: number = 150): ImageData {
    const gray = new cv.Mat()

    try {
      // Convert to grayscale
      cv.cvtColor(this.mat, gray, cv.COLOR_RGBA2GRAY)

      // Apply Canny edge detection (reuse gray as both src and dst)
      cv.Canny(gray, gray, lowThreshold, highThreshold)

      // Convert back to RGBA directly to this.mat
      cv.cvtColor(gray, this.mat, cv.COLOR_GRAY2RGBA)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      gray.delete()
    }

    return this
  }

  /**
   * Apply morphological operations (erode, dilate, open, close)
   * @param operation Operation type (default: MorphologyOperation.CLOSE, see MorphologyOperation enum)
   * @param kernelSize Size of the structuring element (min: 1, typical: 3-9, default: 5)
   * @param shape Shape of the structuring element (default: MorphologyShape.ELLIPSE, see MorphologyShape enum)
   */
  morphology(
    operation: MorphologyOperation = MorphologyOperation.CLOSE,
    kernelSize: number = 5,
    shape: MorphologyShape = MorphologyShape.ELLIPSE,
  ): ImageData {
    const kernel = cv.getStructuringElement(
      shape,
      new cv.Size(kernelSize, kernelSize),
    )

    try {
      cv.morphologyEx(this.mat, this.mat, operation, kernel)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      kernel.delete()
    }

    return this
  }

  /**
   * Sharpen the image using unsharp masking
   * @param amount Amount of sharpening (min: 0, typical: 0.5-2.5, default: 1.5, higher = more sharpening)
   */
  sharpen(amount: number = 1.5): ImageData {
    const blurred = new cv.Mat()
    const temp = new cv.Mat()

    try {
      // Blur the image
      cv.GaussianBlur(this.mat, blurred, new cv.Size(5, 5), 0)

      // Subtract blurred from original to get high-frequency details
      cv.subtract(this.mat, blurred, temp)

      // Add the high-frequency details back with weight
      cv.addWeighted(this.mat, 1.0, temp, amount, 0, this.mat)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      blurred.delete()
      temp.delete()
    }

    return this
  }

  /**
   * Apply adaptive threshold (good for images with varying lighting)
   * @param blockSize Size of pixel neighborhood (min: 3, typical: 5-21, default: 11, must be odd, will be adjusted if even)
   * @param C Constant subtracted from the mean (typical: -10 to 10, default: 2, positive = darker threshold, negative = lighter threshold)
   */
  adaptiveThreshold(blockSize: number = 11, C: number = 2): ImageData {
    blockSize = blockSize % 2 === 0 ? blockSize + 1 : blockSize

    const gray = new cv.Mat()

    try {
      // Convert to grayscale
      cv.cvtColor(this.mat, gray, cv.COLOR_RGBA2GRAY)

      // Apply adaptive threshold (reuse gray as both src and dst)
      cv.adaptiveThreshold(
        gray,
        gray,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        blockSize,
        C,
      )

      // Convert back to RGBA directly to this.mat
      cv.cvtColor(gray, this.mat, cv.COLOR_GRAY2RGBA)

      // Update pixeldata
      this.pixeldata = new Uint8ClampedArray(this.mat.data)
    } finally {
      gray.delete()
    }

    return this
  }

  /**
   * Extract smoothed line contours from the image
   * @param blurSize Gaussian blur kernel size for pre-smoothing (min: 0, typical: 3-9, default: 5, 0 = no blur, must be odd)
   * @param morphSize Morphological operation size to clean up noise (min: 0, typical: 2-5, default: 3, 0 = skip)
   * @param epsilon Curve approximation accuracy (min: 0, typical: 0.5-3, default: 0.5, lower = more detail, 0 = no approximation, pixels)
   * @param threshold Binary threshold value (min: 0, max: 255, typical: 100-150, default: 120)
   */
  lines(
    blurSize: number = 5,
    morphSize: number = 3,
    epsilon: number = 0.5,
    threshold: number = 120,
  ): Vector<2>[][] {
    const temp = new cv.Mat()

    cv.cvtColor(this.mat, temp, cv.COLOR_RGBA2GRAY)

    // 1. Pre-smooth with Gaussian blur
    if (blurSize > 0) {
      const kernelSize = blurSize % 2 === 0 ? blurSize + 1 : blurSize
      cv.GaussianBlur(temp, temp, new cv.Size(kernelSize, kernelSize), 0)
    }

    cv.threshold(temp, temp, threshold, 255, cv.THRESH_BINARY)

    // 2. Morphological operations to reduce noise
    if (morphSize > 0) {
      const kernel = cv.getStructuringElement(
        MorphologyShape.ELLIPSE,
        new cv.Size(morphSize, morphSize),
      )
      // Close small gaps
      cv.morphologyEx(temp, temp, MorphologyOperation.CLOSE, kernel)
      // Remove small noise
      cv.morphologyEx(temp, temp, MorphologyOperation.OPEN, kernel)
      kernel.delete()
    }

    const contours = new cv.MatVector()
    const hierarchy = new cv.Mat()
    cv.findContours(
      temp,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE,
    )

    const lines: Vector<2>[][] = []
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i)

      // 3. Approximate contour to reduce points
      const approx = new cv.Mat()
      if (epsilon > 0) {
        // Use epsilon directly as pixel tolerance
        cv.approxPolyDP(contour, approx, epsilon, true)
      } else {
        contour.copyTo(approx)
      }
      const points: Vector<2>[] = []
      for (let j = 0; j < approx.rows; j++) {
        const x = approx.data32S[j * 2]
        const y = approx.data32S[j * 2 + 1]
        points.push(new Vector(x, y))
      }

      if (points.length > 1) {
        lines.push(points)
      }

      approx.delete()
    }

    temp.delete()
    contours.delete()
    hierarchy.delete()

    return lines
  }

  potrace() {
    // https://github.com/tomayac/esm-potrace-wasm
    // https://github.com/tooolbox/node-potrace
    // https://github.com/oslllo/potrace
  }
}
