// use p5 as ref https://p5js.org/reference/#/p5.Image

import { Color } from '../Color'
import { gaussianBlur } from './gaussianBlur'
import { edgeDetection } from './edgeDetection'
import { Vector } from '../Vector'

// https://github.dev/ronikaufman/poetical_computer_vision/blob/main/days01-10/day01/day01.pde
export class ImageData {
  private img: HTMLImageElement
  private pixeldata: Uint8ClampedArray
  private pixelsLoaded: boolean

  static create(input: string) {
    const image = new ImageData(input)
    return image
  }

  /** @param src url or base64 string with image data */
  private constructor(src: string) {
    this.img = new globalThis.Image()
    this.img.src = src

    this.pixelsLoaded = false
    this.pixeldata = new Uint8ClampedArray()
  }

  /** load pixel data using html canvas */
  async loadPixels() {
    if (this.pixelsLoaded) {
      return
    }
    await new Promise<void>((resolve) => {
      this.img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = this.img.width
        canvas.height = this.img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(this.img, 0, 0)

        this.pixeldata = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data
        this.pixelsLoaded = true
        resolve()
      }
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
    return this.pixels.length / 4
  }

  get pixels(): Uint8ClampedArray {
    if (!this.pixelsLoaded)
      throw new Error(
        'pixels not loaded. use `await Image.loadPixels()` before accessing them',
      )
    return this.pixeldata
  }

  clone() {
    const img = new ImageData(this.img.src)
    img.pixeldata = new Uint8ClampedArray(this.pixeldata)
    img.pixelsLoaded = this.pixelsLoaded
    return img
  }

  get(x: number, y: number): Color
  get(p: Vector<2>): Color
  get(x: number, y: number, dx: number, dy: number): Uint8ClampedArray[]
  get(
    x: number | Vector<2>,
    y?: number,
    dx?: number,
    dy?: number,
  ): Uint8ClampedArray | Uint8ClampedArray[] | Color {
    if (x instanceof Vector) {
      return this.get(x.x, x.y)
    }

    if (typeof dx !== 'undefined' && typeof dy !== 'undefined') {
      const width = this.img.width * 4
      const r = []
      const pixels = this.pixels
      if ((x + dx) * 4 > pixels.length) {
        throw Error('x is out of bounds')
      }
      if ((y + dy) * width > pixels.length) {
        throw Error('y is out of bounds')
      }
      for (let o = y * width; o < (y + dy) * width; o += width) {
        r.push(pixels.slice(o + x * 4, o + (x + dx) * 4))
        o += width
      }
      return r
    }

    const width = this.img.width
    const i = y * width * 4 + x * 4
    return new Color(this.pixels.slice(i, i + 4))
  }

  html() {
    // if custom pixeldata transform it to image
    if (this.pixeldata.length > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = this.img.width
      canvas.height = this.img.height
      const ctx = canvas.getContext('2d')!
      ctx.putImageData(
        new window.ImageData(this.pixeldata, this.width, this.height),
        0,
        0,
      )
      this.img.src = canvas.toDataURL('image/png')
    }
    return this.img
  }

  gaussianBlur(radius: number) {
    gaussianBlur(this.pixels, this.width, this.height, radius)
    return this
  }

  private applyCanvasFilter(type: string) {
    const canvas = document.createElement('canvas')
    canvas.width = this.img.width
    canvas.height = this.img.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(
      new window.ImageData(this.pixeldata, this.width, this.height),
      0,
      0,
    )
    ctx.filter = type
    this.pixeldata = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    return this
  }

  // TODO: not working
  brightness(percentage: number) {
    this.applyCanvasFilter(`brightness(${percentage})`)
  }

  horizontalGradient(startPercentage: number, endPercentage: number) {
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

  edgeDetection() {
    const buff = edgeDetection(this.pixels, this.width)
    this.pixeldata = buff
    return this
  }

  greyscale() {
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      // Calculate luminance using standard RGB to grayscale conversion
      const grey = Math.round(
        0.299 * this.pixeldata[i] + // Red
          0.587 * this.pixeldata[i + 1] + // Green
          0.114 * this.pixeldata[i + 2], // Blue
      )

      // Set RGB channels to the same grey value
      this.pixeldata[i] = grey // Red
      this.pixeldata[i + 1] = grey // Green
      this.pixeldata[i + 2] = grey // Blue
      // Alpha channel (i + 3) remains unchanged
    }
    return this
  }

  /**
   * Apply contrast to image making color tend toward middle gray (128)
   * or more towards the outer ends (0, 255)
   *
   * @param factor 1.0 = no change, >1.0 = increased contrast, <1.0 = decreased contrast
   */
  contrast(factor: number) {
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
  forEach(
    callback: (color: Color, x: number, y: number, index: number) => void,
  ) {
    const width = this.width
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      const pixelIndex = i / 4
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      const color = new Color(this.pixeldata.slice(i, i + 4))
      callback(color, x, y, pixelIndex)
    }
    return this
  }

  /**
   * Invert the colors of the image (negative effect)
   * Each RGB channel is inverted: newValue = 255 - oldValue
   */
  invert() {
    for (let i = 0; i < this.pixeldata.length; i += 4) {
      this.pixeldata[i] = 255 - this.pixeldata[i] // Red
      this.pixeldata[i + 1] = 255 - this.pixeldata[i + 1] // Green
      this.pixeldata[i + 2] = 255 - this.pixeldata[i + 2] // Blue
      // Alpha channel (i + 3) remains unchanged
    }
    return this
  }
}
