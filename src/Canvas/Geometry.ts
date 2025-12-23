import { Color } from '../Color'
import { Renderable } from './Renderable'

export const defaultGeometricOptions: GeometricOptions = {
  fill: null,
  fillOpacity: 1,
  stroke: Color.BLACK,
  strokeWidth: 1,
  rotation: 0,
}
export interface GeometricOptions {
  fill: Color | null
  fillOpacity: number
  stroke: Color
  strokeWidth: number
  rotation: number
}

export abstract class Geometry<
  Opts extends GeometricOptions = GeometricOptions,
> extends Renderable {
  options: Opts

  constructor(opts: Opts) {
    super()
    this.options = opts
  }

  /*
   * Set stroke width for the path
   */
  strokeWidth(width: number): this {
    this._dirty = true
    this.options.strokeWidth = width
    return this
  }

  /**
   * Set stroke color for the path
   */
  stroke(color: Color): this {
    this._dirty = true
    this.options.stroke = color
    return this
  }

  /**
   * Set fill color for the path
   */
  fill(color: Color | null): this {
    this._dirty = true
    this.options.fill = color
    return this
  }

  /**
   * Set fill opacity for the path
   */
  fillOpacity(opacity: number): this {
    this._dirty = true
    this.options.fillOpacity = opacity
    return this
  }

  /**
   * Set rotation angle in radians
   */
  rotate(angle: number): this {
    this._dirty = true
    this.options.rotation = angle
    return this
  }

  _applySvgOptions(element: SVGElement) {
    element.setAttribute('stroke', this.options.stroke.hex())
    element.setAttribute(
      'fill',
      this.options.fill === null ? 'none' : this.options.fill.hex(),
    )
    element.setAttribute('fill-opacity', this.options.fillOpacity.toString())
    element.setAttribute('stroke-width', this.options.strokeWidth.toString())
  }

  _applyCanvasOptions(ctx: CanvasRenderingContext2D, path?: Path2D) {
    ctx.lineWidth = this.options.strokeWidth
    if (this.options.fill) {
      ctx.fillStyle = this.options.fill.hex()
      ctx.fill()
    } else {
      ctx.strokeStyle = this.options.stroke.hex()
      if (typeof path === 'undefined') {
        ctx.stroke()
      } else {
        ctx.stroke(path)
      }
    }
  }
}
