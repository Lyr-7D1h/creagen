import { Color } from '../Color'
import { gaussianFilter } from './gaussianFilter'
import { sobelGradient } from './sobelGradient'
import { Vector } from '../Vector'
import { greyscaleFilter } from './greyscaleFilter'
import { cannyEdgeDetection } from './cannyEdgeDetection'
import { Bitmap } from '../Bitmap'

// WASM implementation https://silvia-odwyer.github.io/photon/guide/
//
// TODO: calculate image processing in a worker https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
export class ImageData {
  private pixeldata: Uint8ClampedArray

  static async create(src: string) {
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
    this.img = img
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
    // Create a canvas with the current pixel data
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d')!

    // Put our pixel data onto the canvas
    const imageData = ctx.createImageData(this.width, this.height)
    imageData.data.set(this.pixeldata)
    ctx.putImageData(imageData, 0, 0)

    // Create new image from canvas
    const clonedImg = new globalThis.Image()
    clonedImg.src = canvas.toDataURL('image/png')
    clonedImg.width = this.width
    clonedImg.height = this.height

    // Create the cloned ImageData instance
    const cloned = Object.create(ImageData.prototype)
    cloned.img = clonedImg
    cloned.pixeldata = new Uint8ClampedArray(this.pixeldata)

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
    return new Color(this.pixeldata.slice(i, i + 4))
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

  gaussianBlur(radius: number): ImageData {
    gaussianFilter(this.pixeldata, this.width, this.height, radius)
    return this
  }

  private applyCanvasFilter(type: string) {
    const canvas = document.createElement('canvas')
    canvas.width = this.width
    canvas.height = this.height
    const ctx = canvas.getContext('2d')!

    // Create ImageData from our pixel data
    const imageData = ctx.createImageData(this.width, this.height)
    imageData.data.set(this.pixeldata)

    ctx.putImageData(imageData, 0, 0)
    ctx.filter = type
    this.pixeldata = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return this
  }

  // TODO: not working
  brightness(percentage: number) {
    this.applyCanvasFilter(`brightness(${percentage})`)
  }

  horizontalGradient(
    startPercentage: number,
    endPercentage: number,
  ): ImageData {
    const width = this.width * 4
    for (let y = 0; y < this.height; y += 1) {
      const o = y * width
      const p =
        startPercentage + ((endPercentage - startPercentage) * y) / this.height
      for (let x = 0; x < width; x += 4) {
        this.pixeldata[o + x] *= p
        this.pixeldata[o + x + 1] *= p
        this.pixeldata[o + x + 2] *= p
      }
    }
    return this
  }

  /**
   * Use edge detection on the image.
   *
   * @param options Edge detection algorithm and parameters
   *
   * @example
   * ```typescript
   * // Use default Sobel
   * image.edgeDetection()
   *
   * // Explicitly use Sobel
   * image.edgeDetection('sobel')
   *
   * // Use Canny with default parameters
   * image.edgeDetection('canny')
   *
   * // Use Canny with custom parameters
   * image.edgeDetection('canny', 80, 90, 1)
   * ```
   */
  edgeDetection(algorithm: 'sobel'): ImageData
  edgeDetection(
    algorithm: 'canny',
    /**
     * A number between [0-100], given the percentille threshold for which pixel is a weak edge.
     *
     * A weak edge needs to be connected to
     * @default 80
     */
    lowThreshold?: number,
    /**
     * A number between [0-100], given the percentille threshold for which pixel is a strong edge
     * @default 90
     * */
    highThreshold?: number,
    /**
     * How big should the radius be for the gaussian filter
     * @default 1
     */
    gaussianFilterRadius?: number,

    /**
     * Find all connected components and keep only those with sufficient size.
     * Higher values remove more small noise but may eliminate thin lines.
     * @default 8
     */
    minComponentSize?: number,
  ): ImageData
  edgeDetection()
  edgeDetection(
    algorithm: 'sobel' | 'canny' = 'sobel',
    lowThreshold: number = 80,
    highThreshold: number = 90,
    gaussianFilterRadius: number = 1,

    minComponentSize: number = 8,
  ): ImageData {
    switch (algorithm) {
      case 'canny':
        this.pixeldata = cannyEdgeDetection(
          this.pixeldata,
          this.width,
          this.height,
          lowThreshold,
          highThreshold,
          gaussianFilterRadius,
          minComponentSize,
        )
        return this
      case 'sobel':
      default:
        this.pixeldata = sobelGradient(this.pixeldata, this.width)
        return this
    }
  }

  greyscale(): ImageData {
    greyscaleFilter(this.pixeldata)
    return this
  }

  /**
   * Apply contrast to image making color tend toward middle gray (128)
   * or more towards the outer ends (0, 255)
   *
   * @param factor 1.0 = no change, >1.0 = increased contrast, <1.0 = decreased contrast
   */
  contrast(factor: number): ImageData {
    factor = Math.max(0.1, Math.min(3.0, factor))

    // Apply contrast formula: newValue = (oldValue - 128) * factor + 128
    // This centers around middle gray (128) and scales the difference
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      this.pixeldata[i] = Math.max(
        0,
        Math.min(255, (this.pixeldata[i] - 128) * factor + 128),
      ) // Red
      this.pixeldata[i + 1] = Math.max(
        0,
        Math.min(255, (this.pixeldata[i + 1] - 128) * factor + 128),
      ) // Green
      this.pixeldata[i + 2] = Math.max(
        0,
        Math.min(255, (this.pixeldata[i + 2] - 128) * factor + 128),
      ) // Blue
      // Alpha channel (i + 3) remains unchanged
    }
    return this
  }

  /**
   * Iterate over each pixel in the image
   * @param callback Function called for each pixel with (color, x, y, index)
   */
  forEach(callback: (color: Color, startIndex: number) => void): ImageData {
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      callback(new Color(this.pixeldata.slice(i, i + 4)), i)
    }
    return this
  }

  /**
   * Invert the colors of the image (negative effect)
   * Each RGB channel is inverted: newValue = 255 - oldValue
   */
  invert(): ImageData {
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      this.pixeldata[i] = 255 - this.pixeldata[i] // Red
      this.pixeldata[i + 1] = 255 - this.pixeldata[i + 1] // Green
      this.pixeldata[i + 2] = 255 - this.pixeldata[i + 2] // Blue
      // Alpha channel (i + 3) remains unchanged
    }
    return this
  }

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
}

export interface SobelOptions {
  algorithm: 'sobel'
}

export interface CannyOptions {
  algorithm: 'canny'
  /**
   * A number between [0-100], given the percentille threshold for which pixel is a weak edge.
   *
   * A weak edge needs to be connected to
   * @default 80
   */
  lowThreshold?: number
  /**
   * A number between [0-100], given the percentille threshold for which pixel is a strong edge
   * @default 90
   * */
  highThreshold?: number
  /**
   * How big should the radius be for the gaussian filter
   * @default 1
   */
  gaussianFilterRadius?: number

  /**
   * Find all connected components and keep only those with sufficient size.
   * Higher values remove more small noise but may eliminate thin lines.
   * @default 8
   */
  minComponentSize?: number
}

export type EdgeDetectionOptions = SobelOptions | CannyOptions
