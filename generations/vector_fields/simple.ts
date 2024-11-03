import { Vector, vec, Svg, simplex } from 'genart'

const WIDTH = 1000
const HEIGHT = 1000
const s = Svg.create({ width: WIDTH, height: HEIGHT })

// grid
let points: Vector<2>[] = []
for (let x = -10; x <= 10; x += 0.1) {
  for (let y = -10; y <= 10; y += 0.1) {
    points.push(vec(x, y))
  }
}

/// from x,y to i,j
function coord({ x, y }: Vector<2>) {
  return vec(x * 40 + WIDTH / 2, y * 40 + HEIGHT / 2)
}

// for (const p of points) {
//   const { x, y } = coord(p)
//   // s.circle(2, x, y)
// }
// s.circle(2, WIDTH / 2, HEIGHT / 2, { fill: 'red', stroke: 'red' })

// get vector for x,y
function field({ x, y }: Vector<2>) {
  // return vec(y, -(x ** 2) + y).norm()
  const a = simplex(0.1 * x, 0.1 * y)
  return vec(Math.cos(a), Math.sin(a)).norm()
  // const x1 = vec(Math.cos(a), Math.sin(a)).norm()
  // return vec(Math.cos(a), Math.sin(a)).norm()
  return vec(y, -x + y)
  // return vec(y, -x + y).norm().add(x1).div(2)
  // return vec(Math.cos(a), Math.sin(a)).norm()
}

for (let y = -10; y < 10; y += 0.1) {
  const line = []
  let p = vec(y, 0)
  for (let i = 0; i < 50; i++) {
    const d = field(p).norm()
    console.log(d)
    const np = p.clone().add(d)

    line.push(coord(np))
    p = np
  }
  s.curve(line, { fill: 'none' })
}

// for (const p of points) {
//   const v = field(p).norm().div(10)
//   console.log(v)
//   const d = coord(p.clone().add(v))
//   s.path().moveTo(coord(p)).lineTo(d)
// }

load(s)
