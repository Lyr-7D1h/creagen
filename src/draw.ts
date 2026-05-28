export type DrawFn = (
  /** Total running time since page load, as a high precision timestamp */
  t: DOMHighResTimeStamp,
  /** Delta time in ms, by default draw is rendering at 60fps so dt should be around 1/60 s = 16.666666667 ms */
  dt: number,
) => void

let handle: number | undefined
/**
 * Run a draw loop that runs `fn` every 1/60 seconds
 *
 * Where `DrawFn` is `(t: DOMHighResTimeStamp, dt: number) => void`
 *  - `t` being a number (double) representing the time since drawing in milliseconds. https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp
 * - `dt` time between frames
 */
export function draw(fn: DrawFn) {
  if (handle) cancelAnimationFrame(handle)
  const now = document.timeline?.currentTime
  let t0 = typeof now === 'number' ? now : performance.now()
  const draw = (t1: DOMHighResTimeStamp) => {
    const dt = t1 - t0
    fn(t1, dt)
    t0 = t1
    handle = requestAnimationFrame(draw)
  }
  handle = requestAnimationFrame(draw)
}
