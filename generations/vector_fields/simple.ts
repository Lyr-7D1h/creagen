import { Vector, vec, Svg } from 'genart'

function field({ x, y }: Vector<2>) {
  return vec(y, -(x ** 2) + y)
}

const WIDTH = 1000
const HEIGHT = 1000
const s = Svg.create({ width: WIDTH, height: HEIGHT })

let points = []
for (let x = -10; x <= 10; x += 0.5) {
  for (let y = -10; y <= 10; y += 0.5) {
    points.push(vec(x, y))
  }
}

function coord({ x, y }: Vector<2>) {
  return vec(x * 40 + WIDTH / 2, y * 40 + HEIGHT / 2)
}

for (const p of points) {
  const { x, y } = coord(p)
  // s.circle(2, x, y)
}
// s.circle(2, WIDTH / 2, HEIGHT / 2, { fill: 'red', stroke: 'red' })

for (const p of points) {
  const v = field(p).norm()
  const d = coord(p.clone().add(v))
  s.path().moveTo(coord(p)).lineTo(d)
}

load(s)
