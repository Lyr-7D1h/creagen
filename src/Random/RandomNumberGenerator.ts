import * as Math from '../math'
// TODO: implement same distributions https://jstat.github.io/distributions.html

/**
 * A random() function, must return a number in the interval [0,1), just like Math.random().
 */
export type UnitRandomFn = () => number

/** A random number generator function */
export type RandomFn = () => number

export function rng(randomFn?: UnitRandomFn) {
  return new RandomNumberGenerator(randomFn ?? Math.random)
}

export class RandomNumberGenerator {
  private readonly randomFn: UnitRandomFn
  constructor(random: UnitRandomFn) {
    this.randomFn = random
  }

  /** generate a random number until and including `stop` */
  integer(stop: number): number
  integer(start: number, stop: number): number
  integer(x1: number, x2?: number) {
    if (typeof x2 === 'undefined') {
      return Math.round(this.randomFn() * x1)
    }
    return x1 + Math.round(this.randomFn() * (x2 - x1))
  }

  float(): number
  float(stop: number): number
  float(start: number, stop: number): number
  float(x1?: number, x2?: number) {
    if (typeof x1 === 'undefined') return this.randomFn()
    return this.randomFn() * (x2 ? Math.diff(x1, x2) : x1) + x1
  }

  bool(p: number = 0.5) {
    if (p < 0 || p > 1) throw Error('Requires a float between 0 and 1')
    return this.float() < p
  }
}

/** TODO: https://en.wikipedia.org/wiki/Linear_congruential_generator */
// export function lcg(): number {}

export function xorshift(seed?: number): UnitRandomFn {
  let SEED = seed ?? 2463534242
  return () => {
    SEED ^= SEED << 13
    SEED ^= SEED >> 17
    SEED ^= SEED << 5
    return (SEED >>> 0) / 4294967296
  }
}

/** https://en.wikipedia.org/wiki/Beta_distribution */
export function beta(
  alpha: number,
  beta: number,
  uniformGenerator?: () => number,
): UnitRandomFn {
  return () => {
    const u = uniformGenerator ? uniformGenerator() : Math.random()
    return u ** (1 / alpha) / (u ** (1 / alpha) + (1 - u) ** (1 / beta))
  }
}

/** Normally distributed Random Number Generator (https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform) */
export function boxMuller(
  mean: number,
  deviation: number,
  uniformGenerator?: () => number,
): RandomFn {
  const gen = uniformGenerator ? uniformGenerator : Math.random
  const twopi = 2 * Math.PI

  return () => {
    const u1 = gen()
    const u2 = gen()

    const mag = deviation * Math.sqrt(-2.0 * Math.log(u1))
    const z0 = mag * Math.cos(twopi * u2) + mean

    return z0
  }
}
