import { Color } from '../Color'
import { Renderable } from './Renderable'

export interface TextOptions {
  fill: Color | null
  stroke: Color | null
  strokeWidth: number
  font: string
  fontSize: number
  align: CanvasTextAlign
  baseline: CanvasTextBaseline
  rotation: number
  maxWidth?: number
  lineHeight?: number
}

function svgTextAnchor(align: CanvasTextAlign): string {
  switch (align) {
    case 'center':
      return 'middle'
    case 'right':
    case 'end':
      return 'end'
    case 'left':
    case 'start':
    default:
      return 'start'
  }
}

function svgDominantBaseline(baseline: CanvasTextBaseline): string {
  switch (baseline) {
    case 'top':
      return 'text-before-edge'
    case 'hanging':
      return 'hanging'
    case 'middle':
      return 'middle'
    case 'ideographic':
      return 'ideographic'
    case 'bottom':
      return 'text-after-edge'
    case 'alphabetic':
    default:
      return 'alphabetic'
  }
}

export class Text extends Renderable {
  constructor(
    public value: string,
    public x: number,
    public y: number,
    public options: TextOptions,
  ) {
    super()
  }

  private fontValue(): string {
    return `${this.options.fontSize}px ${this.options.font}`
  }

  content(value: string): this {
    this._dirty = true
    this.value = value
    return this
  }

  position(x: number, y: number): this
  position(position: ArrayLike<number>): this
  position(x: number | ArrayLike<number>, y?: number): this {
    this._dirty = true
    if (typeof x === 'number') {
      if (typeof y !== 'number') throw Error('Expected y number')
      this.x = x
      this.y = y
      return this
    }

    const p = [x[0], x[1]]
    if (typeof p[0] !== 'number' || typeof p[1] !== 'number') {
      throw Error('Expected position with 2 numbers')
    }

    this.x = p[0]
    this.y = p[1]
    return this
  }

  fill(color: Color | null): this {
    this._dirty = true
    this.options.fill = color
    return this
  }

  stroke(color: Color | null): this {
    this._dirty = true
    this.options.stroke = color
    return this
  }

  strokeWidth(width: number): this {
    this._dirty = true
    this.options.strokeWidth = width
    return this
  }

  font(font: string): this {
    this._dirty = true
    this.options.font = font
    return this
  }

  fontSize(size: number): this {
    this._dirty = true
    this.options.fontSize = size
    return this
  }

  align(align: CanvasTextAlign): this {
    this._dirty = true
    this.options.align = align
    return this
  }

  baseline(baseline: CanvasTextBaseline): this {
    this._dirty = true
    this.options.baseline = baseline
    return this
  }

  rotate(angle: number): this {
    this._dirty = true
    this.options.rotation = angle
    return this
  }

  maxWidth(width?: number): this {
    this._dirty = true
    this.options.maxWidth = width
    return this
  }

  lineHeight(height: number): this {
    this._dirty = true
    this.options.lineHeight = height
    return this
  }

  private effectiveLineHeight(): number {
    return this.options.lineHeight ?? this.options.fontSize * 1.2
  }

  override _svg(): SVGTextElement {
    this._dirty = false
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text',
    )
    element.setAttribute('x', this.x.toString())
    element.setAttribute('y', this.y.toString())
    element.setAttribute(
      'fill',
      this.options.fill === null ? 'none' : this.options.fill.hex(),
    )
    element.setAttribute('text-anchor', svgTextAnchor(this.options.align))
    element.setAttribute(
      'dominant-baseline',
      svgDominantBaseline(this.options.baseline),
    )
    element.setAttribute('font-family', this.options.font)
    element.setAttribute('font-size', this.options.fontSize.toString())
    if (this.options.rotation !== 0) {
      const degrees = (this.options.rotation * 180) / Math.PI
      element.setAttribute(
        'transform',
        `rotate(${degrees} ${this.x} ${this.y})`,
      )
    }
    if (this.options.stroke) {
      element.setAttribute('stroke', this.options.stroke.hex())
      element.setAttribute('stroke-width', this.options.strokeWidth.toString())
    }
    const lines = this.value.split('\n')
    if (lines.length === 1) {
      element.textContent = this.value
    } else {
      const effectiveLineHeight = this.effectiveLineHeight()
      for (let i = 0; i < lines.length; i++) {
        const tspan = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'tspan',
        )
        tspan.setAttribute('x', this.x.toString())
        if (i > 0) {
          tspan.setAttribute('dy', effectiveLineHeight.toString())
        }
        tspan.textContent = lines[i]
        element.appendChild(tspan)
      }
    }
    return element
  }

  override _canvas(ctx: CanvasRenderingContext2D): void {
    this._dirty = false
    if (this.options.rotation !== 0) {
      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.rotate(this.options.rotation)
      ctx.translate(-this.x, -this.y)
    }

    ctx.font = this.fontValue()
    ctx.textAlign = this.options.align
    ctx.textBaseline = this.options.baseline

    const lines = this.value.split('\n')
    const effectiveLineHeight = this.effectiveLineHeight()

    if (this.options.stroke) {
      ctx.strokeStyle = this.options.stroke.hex()
      ctx.lineWidth = this.options.strokeWidth
      for (let i = 0; i < lines.length; i++) {
        const lineY = this.y + i * effectiveLineHeight
        if (typeof this.options.maxWidth === 'number') {
          ctx.strokeText(lines[i], this.x, lineY, this.options.maxWidth)
        } else {
          ctx.strokeText(lines[i], this.x, lineY)
        }
      }
    }

    if (this.options.fill) {
      ctx.fillStyle = this.options.fill.hex()
      for (let i = 0; i < lines.length; i++) {
        const lineY = this.y + i * effectiveLineHeight
        if (typeof this.options.maxWidth === 'number') {
          ctx.fillText(lines[i], this.x, lineY, this.options.maxWidth)
        } else {
          ctx.fillText(lines[i], this.x, lineY)
        }
      }
    }

    if (this.options.rotation !== 0) {
      ctx.restore()
    }
  }
}
