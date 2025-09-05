import { Color } from '../Color'
import { Bounds, VectorLike } from '../Vector'
import { Circle } from './Circle'
import { Image } from './Image'
import { GeometricOptions, Geometry } from './Geometry'
import { Path, PathOptions } from './Path'
import { Rectangle, RectangleOptions } from './Rectangle'
import { Arc } from './Arc'

export function getWidth() {
  return Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.offsetWidth,
    document.documentElement.clientWidth,
  )
}

export function getHeight() {
  return Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.documentElement.clientHeight,
  )
}

export type GeometryChild = Rectangle | Circle | Image

/** How the code renders in the browser  */
export enum RenderMode {
  /** Default 2d rendering format */
  C2D = 'c2d',
  /** WebGL rendering format */
  WebGL = 'webgl',
  /** Svg rendering format */
  Svg = 'svg',
}
export interface CanvasOptions<R extends RenderMode = RenderMode.C2D> {
  width?: number
  height?: number
  renderMode?: R
  canvas?: HTMLCanvasElement
}

export class Canvas<R extends RenderMode> {
  children: Geometry[]
  element: HTMLCanvasElement | SVGElement
  ctx?: CanvasRenderingContext2D

  width: number
  height: number

  static create<R extends RenderMode>(opts?: CanvasOptions<R>) {
    return new Canvas<R>(opts)
  }

  private constructor(opts?: CanvasOptions<R>) {
    const renderMode = opts?.renderMode ?? RenderMode.C2D
    this.width = opts?.width ?? getWidth()
    this.height = opts?.height ?? getHeight()

    if (renderMode === RenderMode.WebGL) throw Error('WebGL not supported yet')
    if (renderMode === RenderMode.Svg) {
      if (opts?.canvas) throw Error('Canvas cannot be passed to SVG mode')
      this.element = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      )
      this.element.setAttribute('width', this.width.toString())
      this.element.setAttribute('height', this.height.toString())
    } else {
      this.element = opts?.canvas ?? document.createElement('canvas')
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
    this.children.push(child)
  }

  background(color: Color) {
    this.rect(0, 0, this.width, this.height, { fill: color, strokeWidth: 0 })
  }

  // circle(position: Vector<2>, radius: number, options?: GeometricOptions)
  // circle(x: number, y: number, radius: number, options?: GeometricOptions)

  circle(position: VectorLike<2>, radius: number, options?: GeometricOptions)
  circle(x: number, y: number, radius: number, options?: GeometricOptions)
  circle(
    x: number | VectorLike<2>,
    y: number,
    radius: number | GeometricOptions,
    options?: GeometricOptions,
  )
  circle(
    x: number | VectorLike<2>,
    y: number,
    radius?: number | GeometricOptions,
    options?: GeometricOptions,
  ) {
    const circle = new Circle(x, y, radius, options)
    this.add(circle)
    return circle
  }

  rect(
    position: VectorLike<2>,
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
    x1: VectorLike<2> | number,
    x2: number,
    x3: number,
    x4?: number | RectangleOptions,
    x5?: RectangleOptions,
  ): Rectangle {
    const rect = new Rectangle(x1, x2, x3, x4, x5)
    this.add(rect)
    return rect
  }

  image(x: number, y: number, width: number, height: number, src: string) {
    const image = new Image(x, y, width, height, src)
    this.add(image)
    return image
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
    options?: GeometricOptions,
  ) {
    const arc = new Arc(
      x,
      y,
      radius,
      startAngle,
      endAngle,
      counterclockwise,
      options,
    )
    this.add(arc)
    return arc
  }

  path(options?: PathOptions) {
    const path = new Path(options)
    this.add(path)
    return path
  }

  line(x1: VectorLike<2>, x2: VectorLike<2>, opts?: PathOptions) {
    const line = new Path(opts)
    line.add(x1)
    line.add(x2)
    this.add(line)
    return line
  }

  load() {
    // if svg
    if (!this.ctx) {
      for (const c of this.children) {
        this.element.appendChild(c._svg())
      }
      return
    }

    for (const c of this.children) {
      c._canvas(this.ctx)
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
