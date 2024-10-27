import { Vector, vec, svg } from 'genart'

function field({ x, y }: Vector<2>) {
  return vec(y, -x + y)
}

const WIDTH = 1000
const HEIGHT = 1000
const s = svg({ width: WIDTH, height: HEIGHT })

let points = []
for (let x = -5; x <= 5; x++) {
  for (let y = -5; y <= 5; y++) {
    points.push(vec(x, y))
  }
}

function coord({ x, y }: Vector<2>) {
  return vec(x * 50 + WIDTH / 2, y * 50 + HEIGHT / 2)
}

for (const p of points) {
  const { x, y } = coord(p)
  s.circle(2, x, y)
}
s.circle(2, WIDTH / 2, HEIGHT / 2, { fill: 'red', stroke: 'red' })

for (const p of points) {
  const v = field(p).norm()
  const d = coord(p.clone().add(v))
  s.path().moveTo(coord(p)).lineTo(d)
}

load(s)
