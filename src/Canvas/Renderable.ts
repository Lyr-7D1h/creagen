export abstract class Renderable {
  // TODO: make implementation detail
  abstract _svg(): SVGElement
  abstract _canvas(ctx: CanvasRenderingContext2D): void
}
