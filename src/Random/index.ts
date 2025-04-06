import { boxMuller, RandomNumberGenerator } from './numgen'

export * from './simplex'
export * from './perlin'
export * from './numgen'
export * from './pmf'
export * from './cdf'

const defaultRng = new RandomNumberGenerator(Math.random)

export class Random extends RandomNumberGenerator {
  /** generate a random number until and including `stop` */
  static integer(stop: number): number
  static integer(start: number, stop: number): number
  static integer(x1: number, x2?: number) {
    return defaultRng.integer(x1, x2)
  }

  static float(stop: number): number
  static float(start: number, stop: number): number
  static float(x1: number, x2?: number) {
    return defaultRng.float(x1, x2)
  }

  /** Get a random number between 0 and 1 */
  static random() {
    return defaultRng.random()
  }

  static xorshift() {
    return
  }
  // static random() {
  //   return new RandomNumberGenerator(Math.random)
  // }
  static boxMuller(
    mean: number,
    deviation: number,
    uniformGenerator?: () => number,
  ) {
    return new RandomNumberGenerator(
      boxMuller(mean, deviation, uniformGenerator),
    )
  }
}
