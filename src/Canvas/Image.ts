import type { ImageData } from '../ImageData'
import { Renderable } from './Renderable'

export type ImageOptions = object

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
    this._dirty = true
    return this.img
  }

  _svg(): SVGCircleElement {
    this._dirty = false
    throw new Error('not implemented')
  }

  _canvas(ctx: CanvasRenderingContext2D): void {
    this._dirty = false
    // TODO: make load synchronically
    void this.img.html().then((img) => {
      if (!img.complete) {
        return
      }
      ctx.save()
      ctx.drawImage(img, this.x, this.y, this.width, this.height)
      ctx.restore()
    })
  }
}
