import { CREAGEN_PRECISION } from '../constants'
import { GeometricOptions, Geometry } from './Geometry'

export type CircleOptions = GeometricOptions
export class Circle extends Geometry {
  constructor(
    public x: number,
    public y: number,
    public radius: number,
    opts: CircleOptions,
  ) {
    super(opts)
  }

  override _svg(): SVGCircleElement {
    this._dirty = false
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle',
    )
    element.setAttribute('r', this.radius.toFixed(CREAGEN_PRECISION))
    element.setAttribute('cx', this.x.toFixed(CREAGEN_PRECISION))
    element.setAttribute('cy', this.y.toFixed(CREAGEN_PRECISION))
    super._applySvgOptions(element)

    return element
  }

  override _canvas(ctx: CanvasRenderingContext2D) {
    this._dirty = false
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI)
    this._applyCanvasOptions(ctx)
    ctx.closePath()
  }
}
