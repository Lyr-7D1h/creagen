export { draw, type DrawFn } from './draw'
export { Iter } from './iter'
export { load, type LoadableObject } from './load'
export * as Math from './math'

export { Canvas, getHeight, getWidth, RenderMode } from './Canvas'
export { type ArcOptions } from './Canvas/Arc'
export { type CircleOptions } from './Canvas/Circle'
export { type ImageOptions } from './Canvas/Image'
export { type PathOptions } from './Canvas/Path'
export { type RectangleOptions } from './Canvas/Rectangle'
export { type TextOptions } from './Canvas/Text'

export { color, Color } from './Color'
export { Conversion } from './Conversion'
export {
  ImageData,
  MorphologyOperation,
  MorphologyShape,
  ThresholdType,
} from './ImageData'
export { KDTree } from './kdtree'
export { PointCloud } from './PointCloud'
export { QuadTree } from './quadtree'
export { Random } from './Random/index'
export { SpatialMap } from './spatialmap'
// export { Motion } from './Motion'
export { Audio, type Feature, type FeatureResult } from './Audio'
export { Bitmap } from './Bitmap'
export {
  ContourApproximation,
  type ContourExtractorOpts,
} from './ContourExtractor'
export { matrix, Matrix } from './Matrix'
export { KMeans } from './SignalProcessing/KMeans'
export {
  ALL_DIRECTIONS,
  createVectorType,
  DIAGONALS,
  DIRECTIONS,
  Float32Vector,
  Float64Vector,
  Int16Vector,
  Int32Vector,
  Int8Vector,
  isVector,
  Uint16Vector,
  Uint32Vector,
  Uint8ClampedVector,
  Uint8Vector,
  vec,
  Vector,
} from './Vector'
export type { AnyVector } from './Vector'

export type {
  FixedArray,
  FixedFloat64Array,
  FixedNumberArray,
  FlatBounds,
} from './types'

export { Tree, type NodeId } from './Tree'
