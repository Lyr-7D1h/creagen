import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Color } from '../Color'

const defaultOptions: GeometricOptions = {
  ...defaultGeometricOptions,
  fill: Color.BLACK,
}

export class Arc extends Geometry {
  x: number
  y: number
  radius: number
  startAngle: number
  endAngle: number
  counterclockwise?: boolean

  constructor(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
    options: GeometricOptions = defaultOptions,
  ) {
    super()
    this.x = x as number
    this.y = y
    this.radius = radius as number
    this.startAngle = startAngle
    this.endAngle = endAngle
    this.counterclockwise = counterclockwise
    this.options = { ...defaultOptions, ...options }
  }

  override _svg(): SVGCircleElement {
    throw Error('Not implemented')
  }

  override _canvas(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(
      this.x,
      this.y,
      this.radius,
      this.startAngle,
      this.endAngle,
      this.counterclockwise,
    )
    this._applyCanvasOptions(ctx)
    ctx.fill()
  }
}
