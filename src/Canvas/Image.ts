import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Image as ImageData } from '../Image'

export interface ImageOptions extends GeometricOptions {}

export class Image extends Geometry<ImageOptions> {
  x: number
  y: number
  width: number
  height: number
  img: ImageData

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    src: string,
    options?: ImageOptions,
  ) {
    super()
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.img = ImageData.create(src)
    this.options = options || (defaultGeometricOptions as ImageOptions)
  }

  _svg(): SVGCircleElement {
    throw new Error('not implemented')
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.drawImage(this.img.html(), this.x, this.y, this.width, this.height)
    ctx.restore()
  }
}
