import { Bitmap } from '../Bitmap'

export function zhangSuenThinning(map: Bitmap) {
  const height = map.height
  const width = map.width

  let changed = true
  const out = map.clone()

  while (changed) {
    changed = false

    for (let pass = 0; pass < 3; pass++) {
      const toRemove: [number, number][] = []

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const p = out.get(x, y)
          if (!p) continue

          // Neighbors clockwise: p2..p9
          const p2 = out.get(x, y - 1)
          const p3 = out.get(x + 1, y - 1)
          const p4 = out.get(x + 1, y)
          const p5 = out.get(x + 1, y + 1)
          const p6 = out.get(x, y + 1)
          const p7 = out.get(x - 1, y + 1)
          const p8 = out.get(x - 1, y)
          const p9 = out.get(x - 1, y - 1)

          const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9]
          const numNeighbors = neighbors.filter((n) => n).length

          if (numNeighbors < 2 || numNeighbors > 6) continue

          // Count 0->1 transitions in order
          let transitions = 0
          for (let i = 0; i < neighbors.length; i++) {
            const curr = neighbors[i]
            const next = neighbors[(i + 1) % neighbors.length]
            if (!curr && next) transitions++
          }
          if (transitions !== 1) continue

          if (pass === 0) {
            if (!((!p2 || !p4 || !p6) && (!p4 || !p6 || !p8))) continue
          } else {
            if (!((!p2 || !p4 || !p8) && (!p2 || !p6 || !p8))) continue
          }

          toRemove.push([x, y])
        }
      }

      if (toRemove.length > 0) {
        changed = true
        for (const [x, y] of toRemove) {
          out.set(x, y, false)
        }
      }
    }
  }

  return out
}
