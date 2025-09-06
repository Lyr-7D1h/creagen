import { GeometricOptions, Geometry } from './Geometry'

export interface RectangleOptions extends GeometricOptions {}

export class Rectangle extends Geometry<RectangleOptions> {
  x: number
  y: number
  width: number
  height: number

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    opts: RectangleOptions,
  ) {
    super(opts)
    this.x = x
    this.y = y
    this.width = width
    this.height = height as number
  }

  _svg() {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'rect',
    )
    element.setAttribute('width', this.width.toString())
    element.setAttribute('height', this.height.toString())
    element.setAttribute('x', this.x.toString())
    element.setAttribute('y', this.y.toString())
    super._applySvgOptions(element)
    return element
  }

  _canvas(ctx: CanvasRenderingContext2D) {
    this._applyCanvasOptions(ctx)
    ctx.fillRect(this.x, this.y, this.width!, this.height)
  }
}
