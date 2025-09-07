import { GeometricOptions, Geometry } from './Geometry'
import { ImageData as ImageData } from '../ImageData'

export interface ImageOptions extends GeometricOptions {}

export class Image extends Geometry<ImageOptions> {
  static async create(
    x: number,
    y: number,
    width: number,
    height: number,
    src: string,
    options: ImageOptions,
  ) {
    const img = await ImageData.create(src)
    return await new Image(x, y, width, height, img, options)
  }

  private constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    private img: ImageData,
    options: ImageOptions,
  ) {
    super(options)
  }

  data() {
    return this.img
  }

  _svg(): SVGCircleElement {
    throw new Error('not implemented')
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    const img = this.img.html()
    if (img.complete) {
      throw Error('Image has not been loaded')
    }
    ctx.save()
    ctx.drawImage(img, this.x, this.y, this.width, this.height)
    ctx.restore()
  }
}
