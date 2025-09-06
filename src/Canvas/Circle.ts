import { GeometricOptions, Geometry } from './Geometry'

export class Circle extends Geometry {
  constructor(
    public x: number,
    public y: number,
    public radius: number,
    opts: GeometricOptions,
  ) {
    super(opts)
  }

  override _svg(): SVGCircleElement {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    element.setAttribute('r', this.radius.toString())
    element.setAttribute('cx', this.x.toString())
    element.setAttribute('cy', this.y.toString())
    super._applySvgOptions(element)

    return element
  }

  override _canvas(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI)
    this._applyCanvasOptions(ctx)
    ctx.closePath()
  }
}
