import { defaultGeometricOptions, GeometricOptions, Geometry } from './Geometry'
import { Color } from '../Color'
import { Conversion } from '../Conversion'

const defaultOptions: GeometricOptions = {
  ...defaultGeometricOptions,
  fill: Color.BLACK,
}

export class Circle extends Geometry {
  x: number
  y: number
  radius: number

  constructor(
    x: number | ArrayLike<number>,
    y: number,
    radius?: number | GeometricOptions,
    options?: GeometricOptions,
  ) {
    super()
    if (Conversion.isArrayLike(x)) {
      if (typeof radius === 'number') throw Error('Expected GeometricOptions')
      const p = Conversion.toFixedNumberArray(x, 2)
      this.x = p[0]
      this.y = p[1]

      this.radius = y
      this.options =
        typeof radius === 'undefined'
          ? defaultOptions
          : { ...defaultOptions, ...radius }
      return
    }
    this.x = x as number
    this.y = y
    this.radius = radius as number
    this.options = { ...defaultOptions, ...options }
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
