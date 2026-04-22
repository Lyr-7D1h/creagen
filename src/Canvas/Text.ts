import { CREAGEN_PRECISION } from '../constants'
import { GeometricOptions, Geometry } from './Geometry'

export interface TextOptions extends GeometricOptions {
  fontFamily: string
  fontSize: number
  fontStyle: string
  fontWeight: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  maxWidth: number | null
  lineHeight: number
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
      return 'central'
    case 'ideographic':
      return 'ideographic'
    case 'bottom':
      return 'text-after-edge'
    case 'alphabetic':
    default:
      return 'alphabetic'
  }
}

function buildFont(options: TextOptions): string {
  return `${options.fontStyle} ${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`
}

function wrapTextLines(
  text: string,
  maxWidth: number | null,
  measure: (value: string) => number,
): string[] {
  const rawLines = text.split('\n')
  if (!maxWidth || maxWidth <= 0) return rawLines

  const lines: string[] = []
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter((word) => word.length > 0)
    if (words.length === 0) {
      lines.push('')
      continue
    }

    let current = words[0]
    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const next = `${current} ${word}`
      if (measure(next) <= maxWidth) {
        current = next
      } else {
        lines.push(current)
        current = word
      }
    }
    lines.push(current)
  }
  return lines
}

function measureTextSvg(font: string, text: string): number {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return text.length * 8
  ctx.font = font
  return ctx.measureText(text).width
}

export class Text extends Geometry<TextOptions> {
  x: number
  y: number
  value: string

  constructor(x: number, y: number, value: string, options: TextOptions) {
    super(options)
    this.x = x
    this.y = y
    this.value = value
  }

  text(value: string): this {
    if (this.value === value) return this
    this._dirty = true
    this.value = value
    return this
  }

  override _svg(): SVGTextElement {
    this._dirty = false
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text',
    )

    element.setAttribute('x', this.x.toFixed(CREAGEN_PRECISION))
    element.setAttribute('y', this.y.toFixed(CREAGEN_PRECISION))
    element.setAttribute('font-family', this.options.fontFamily)
    element.setAttribute('font-size', this.options.fontSize.toString())
    element.setAttribute('font-style', this.options.fontStyle)
    element.setAttribute('font-weight', this.options.fontWeight)
    element.setAttribute('text-anchor', svgTextAnchor(this.options.textAlign))
    element.setAttribute(
      'dominant-baseline',
      svgDominantBaseline(this.options.textBaseline),
    )
    this._applySvgOptions(element)

    if (this.options.rotation !== 0) {
      const degrees = (this.options.rotation * 180) / Math.PI
      element.setAttribute(
        'transform',
        `rotate(${degrees} ${this.x} ${this.y})`,
      )
    }

    const font = buildFont(this.options)
    const measure = (value: string) => measureTextSvg(font, value)
    const lines = wrapTextLines(this.value, this.options.maxWidth, measure)
    const lineHeightPx = this.options.lineHeight * this.options.fontSize

    if (lines.length === 1) {
      element.textContent = lines[0]
      return element
    }

    for (let i = 0; i < lines.length; i++) {
      const tspan = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'tspan',
      )
      tspan.setAttribute('x', this.x.toFixed(CREAGEN_PRECISION))
      if (i > 0) {
        tspan.setAttribute('dy', lineHeightPx.toString())
      }
      tspan.textContent = lines[i]
      element.appendChild(tspan)
    }

    return element
  }

  override _canvas(ctx: CanvasRenderingContext2D) {
    this._dirty = false
    ctx.save()
    ctx.font = buildFont(this.options)
    ctx.textAlign = this.options.textAlign
    ctx.textBaseline = this.options.textBaseline
    ctx.lineWidth = this.options.strokeWidth

    if (this.options.rotation !== 0) {
      ctx.translate(this.x, this.y)
      ctx.rotate(this.options.rotation)
      ctx.translate(-this.x, -this.y)
    }

    const measure = (value: string) => ctx.measureText(value).width
    const lines = wrapTextLines(this.value, this.options.maxWidth, measure)
    const lineHeightPx = this.options.lineHeight * this.options.fontSize

    for (let i = 0; i < lines.length; i++) {
      const y = this.y + i * lineHeightPx
      if (this.options.fill) {
        ctx.fillStyle = this.options.fill.hex()
        ctx.fillText(lines[i], this.x, y, this.options.maxWidth ?? undefined)
      }
      if (this.options.strokeWidth > 0 && this.options.stroke) {
        ctx.strokeStyle = this.options.stroke.hex()
        ctx.strokeText(lines[i], this.x, y, this.options.maxWidth ?? undefined)
      }
    }

    ctx.restore()
  }
}
