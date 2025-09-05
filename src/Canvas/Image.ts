import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { ImageData as ImageData } from '../ImageData'

export interface ImageOptions extends GeometricOptions {}

export class Image extends Geometry<ImageOptions> {
  img: ImageData

  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    src: string,
    options?: ImageOptions,
  ) {
    super()
    this.img = ImageData.create(src)
    this.options = options || (defaultGeometricOptions as ImageOptions)
  }

  data() {
    return this.img
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
