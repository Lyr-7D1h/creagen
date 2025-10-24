import { ImageData as ImageData } from '../ImageData'
import { Renderable } from './Renderable'

export interface ImageOptions {}

export class Image extends Renderable {
  constructor(
    private readonly img: ImageData,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    _options: ImageOptions,
  ) {
    super()
  }

  data() {
    return this.img
  }

  _svg(): SVGCircleElement {
    throw new Error('not implemented')
  }

  async _canvas(ctx: CanvasRenderingContext2D) {
    const img = await this.img.html()
    if (!img.complete) {
      throw Error('Image has not been loaded')
    }
    ctx.save()
    ctx.drawImage(img, this.x, this.y, this.width, this.height)
    ctx.restore()
  }
}
