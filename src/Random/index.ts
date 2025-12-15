import { perlin } from './perlin'
import {
  beta as betaFn,
  boxMuller,
  RandomFn,
  RandomNumberGenerator,
  UnitRandomFn,
  xorshift,
} from './RandomNumberGenerator'

export * from './simplex'
export * from './perlin'
export * from './RandomNumberGenerator'
export * from './pmf'
export * from './cdf'

const defaultRng = new RandomNumberGenerator(Math.random)

/**
 * Random namespace
 *
 * Generate random numbers using different distributions and generators
 *
 * Random number generating functions with a range between 0 and 1 will return their own random number generator
 */
export class Random {
  /** generate a random number until and including `stop` */
  static integer(stop: number): number
  static integer(start: number, stop: number): number
  static integer(x1: number, x2?: number) {
    return defaultRng.integer(x1, x2!)
  }

  static float(): number
  static float(stop: number): number
  static float(start: number, stop: number): number
  static float(x1?: number, x2?: number) {
    return defaultRng.float(x1 as number, x2!)
  }

  static perlin(x: number, y: number, z: number) {
    return perlin(x, y, z)
  }

  static bool(p: number = 0.5) {
    return defaultRng.bool(p)
  }

  static xorshift(seed?: number) {
    return new RandomNumberGenerator(xorshift(seed))
  }

  /** https://en.wikipedia.org/wiki/Beta_distribution */
  static beta(alpha: number, beta: number, uniformGenerator?: UnitRandomFn) {
    return new RandomNumberGenerator(betaFn(alpha, beta, uniformGenerator))
  }

  /** Normally distributed Random Number Generator using [Box Muller](https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
  static boxMuller(
    mean: number,
    deviation: number,
    uniformGenerator?: UnitRandomFn,
  ) {
    return new RandomNumberGenerator(
      boxMuller(mean, deviation, uniformGenerator),
    )
  }

  /** Exponentially distributed random number https://en.wikipedia.org/wiki/Exponential_distribution bounded to never exceed 1*/
  static truncatedExponential(lambda: number, uniformGenerator?: RandomFn) {
    return new RandomNumberGenerator(() => {
      const u = uniformGenerator ? uniformGenerator() : Math.random()
      return -Math.log(1 - u * (1 - Math.exp(-lambda))) / lambda
    })
  }

  /** Normally distributed Random Number Generator using [Box Muller](https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
  static normal(
    mean: number,
    deviation: number,
    uniformGenerator?: UnitRandomFn,
  ): RandomFn {
    return boxMuller(mean, deviation, uniformGenerator)
  }

  /** Exponentially distributed random number https://en.wikipedia.org/wiki/Exponential_distribution */
  static exponential(
    lambda: number,
    uniformGenerator?: UnitRandomFn,
  ): RandomFn {
    return () => {
      const u = uniformGenerator ? uniformGenerator() : Math.random()
      return -Math.log(u) / lambda
    }
  }
}
