export * as Math from './math'
export { load, type LoadableObject } from './load'
export { draw, type DrawFn } from './draw'
export { Iter } from './iter'

export { type CircleOptions } from './Canvas/Circle'
export { type ArcOptions } from './Canvas/Arc'
export { type ImageOptions } from './Canvas/Image'
export { type PathOptions } from './Canvas/Path'
export { type RectangleOptions } from './Canvas/Rectangle'
export { Canvas, getWidth, getHeight, RenderMode } from './Canvas'

export { Random } from './Random/index'
export { SpatialMap } from './spatialmap'
export { KDTree } from './kdtree'
export { QuadTree } from './quadtree'
export {
  ImageData,
  MorphologyOperation,
  MorphologyShape,
  ThresholdType,
} from './ImageData'
export { color, Color } from './Color'
export { PointCloud } from './PointCloud'
export { Conversion } from './Conversion'
// export { Motion } from './Motion'
export { vec, Vector, ALL_DIRECTIONS, DIRECTIONS, DIAGONALS } from './Vector'
export { matrix, Matrix } from './Matrix'
export { KMeans } from './SignalProcessing/KMeans'
export { Audio, type Feature, type FeatureResult } from './Audio'
export { Bitmap } from './Bitmap'
export {
  ContourApproximation,
  type ContourExtractorOpts,
} from './ContourExtractor'

export type { FixedNumberArray, FixedArray, FlatBounds } from './types'

export { Tree, type NodeId } from './Tree'
