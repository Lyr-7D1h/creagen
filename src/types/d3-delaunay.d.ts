declare module 'd3-delaunay' {
  export class Delaunay {
    constructor(points: Float64Array | ArrayLike<number>)

    static from(
      points: ArrayLike<[number, number]> | ArrayLike<ArrayLike<number>>,
    ): Delaunay

    halfedges: Int32Array
    hull: Int32Array
    inedges: Int32Array
    points: Float64Array
    triangles: Int32Array

    find(x: number, y: number, startingIndex?: number): number
    update(): void
    voronoi(bounds: [number, number, number, number]): Voronoi
  }

  export interface Voronoi {
    circumcenters: Float64Array
    vectors: Float64Array
    delaunay: Delaunay
    cellPolygons(): [number, number][][]
    cellPolygon(i: number): [number, number][] | null
  }
}
