export type DrawFn = (dt: number) => void

let handle
/** Run a draw loop that runs `fn` every 1/60 seconds */
export function draw(fn: DrawFn) {
  if (handle) cancelAnimationFrame(handle)
  let t0 = (document.timeline.currentTime as number) ?? 0
  let s = 0
  const draw = (t1: DOMHighResTimeStamp) => {
    if (t1 - s >= 1000) {
      s += 1000
    }
    const dt = t1 - t0

    fn(dt)
    t0 = t1
    handle = requestAnimationFrame(draw)
  }
  handle = requestAnimationFrame(draw)
}
