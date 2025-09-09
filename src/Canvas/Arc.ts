import { GeometricOptions, Geometry } from './Geometry'

export interface ArcOptions extends GeometricOptions {}
export class Arc extends Geometry {
  constructor(
    options: GeometricOptions,
    public x: number,
    public y: number,
    public radius: number,
    public startAngle: number,
    public endAngle: number,
    public counterclockwise?: boolean,
  ) {
    super(options)
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
