declare module 'd3-quadtree' {
  export interface Quadtree<T> {
    data(): T[]
    search?(x: number, y: number, radius?: number): T | undefined
  }

  export function quadtree<T>(data?: T[]): Quadtree<T>
}
