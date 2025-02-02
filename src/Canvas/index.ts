import { Color } from '../Color'
import { Bounds, Vector } from '../Vector'
import { Circle } from './Circle'
import { GeometricOptions, Geometry } from './Geometry'
import { Path, PathOptions } from './Path'
import { Rectangle, RectangleOptions } from './Rectangle'

export type GeometryChild = Rectangle | Circle
export interface CanvasOptions {
  renderMode?: 'canvas' | 'svg'
}

const defaultValues = {
  renderMode: 'canvas' as 'canvas' | 'svg',
}

export class Canvas {
  children: Geometry[]
  element: HTMLCanvasElement | SVGElement
  ctx?: CanvasRenderingContext2D

  width: number
  height: number

  static create(width?: number, height?: number, options?: CanvasOptions) {
    return new Canvas(width, height, options)
  }

  private constructor(
    width?: number,
    height?: number,
    options?: CanvasOptions,
  ) {
    options = options ? { ...defaultValues, ...options } : defaultValues
    this.width = width ?? window.innerWidth
    this.height = height ?? window.innerHeight
    if (options.renderMode === 'svg') {
      this.element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
    } else {
      this.element = document.createElement('canvas')
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
      this.ctx = this.element.getContext('2d')
    }
    this.children = []
  }

  clear() {
    this.element.innerHTML = ''
    this.children = []
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height)
  }

  private add(child: Geometry) {
    if (this.ctx) child._canvas(this.ctx)
    this.children.push(child)
  }

  background(color: Color) {
    this.rect(0, 0, this.width, this.height, { fill: color })
  }

  circle(position: Vector<2>, radius: number, options?: GeometricOptions)
  circle(x: number, y: number, radius: number, options?: GeometricOptions)
  circle(
    x: number | Vector<2>,
    y: number,
    radius: number | GeometricOptions,
    options?: GeometricOptions,
  ) {
    const circle = new Circle(x, y, radius, options)
    this.add(circle)
    return circle
  }

  rect(
    position: Vector<2>,
    width: number,
    height: number,
    options?: RectangleOptions,
  ): Rectangle
  rect(
    x: number,
    y: number,
    width: number,
    height: number,
    options?: RectangleOptions,
  ): Rectangle
  rect(
    x1: Vector<2> | number,
    x2: number,
    x3: number,
    x4?: number | RectangleOptions,
    x5?: RectangleOptions,
  ): Rectangle {
    const rect = new Rectangle(x1, x2, x3, x4, x5)
    this.add(rect)
    return rect
  }

  path(options?: PathOptions) {
    const path = new Path(options)
    this.add(path)
    return path
  }

  line(x1: Vector<2>, x2: Vector<2>) {
    const line = new Path()
    line.add(x1)
    line.add(x2)
    this.add(line)
    return line
  }

  load() {
    if (!this.ctx) {
      for (const c of this.children) {
        this.element.appendChild(c._svg())
      }
    }
  }

  /** Returns bounds [[xmin, xmax], [ymin, ymax]] */
  bounds(): Bounds<2> {
    return [
      [0, this.width],
      [0, this.height],
    ]
  }

  html(): SVGElement | HTMLCanvasElement {
    this.load()
    return this.element
  }
}
