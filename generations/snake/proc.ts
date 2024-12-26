import { Math, Canvas, vec, Color, rng, Vector } from 'genart'

const canvas = Canvas.create()
const rand = rng()

let body: Vector<2>[] = []
for (let i = 0; i < 20; i++) {
  body.push(vec(50, 50))
}
let jointDistance = 20
// Velocity vector in polar coordinates
// [angle, velocity]
let velocity = vec(0, 50 / 1000)
let maxVelocity = 200 / 1000
let angularVelocity = (1 / 4) * Math.PI
let acceleration = 0.0001

draw((dt) => {
  canvas.clear()

  // change direction
  if (rand.random() > 0.95) {
    angularVelocity = (rand.integer(-1, 1) * 2) / 1000
  }
  if (rand.random() > 0.95) {
    acceleration = rand.integer(-1, 1) * 0.0001
  }
  // if (isNaN(velocity.x)) {
  //   console.log(velocity, angularVelocity)
  //   return
  // }

  velocity[0] += angularVelocity * dt
  velocity[1] += acceleration * dt
  if (Math.abs(velocity[1]) > maxVelocity) {
    velocity[1] = Math.sign(velocity[1]) * velocity[1]
  }

  // calculate how much to move into direction
  const [angle, v] = velocity
  const d = vec(dt * v * Math.cos(angle), dt * v * Math.sin(angle))
  console.log(body)

  body[0].add(d)
  for (let i = 1; i < body.length; i++) {
    let prev = body[i - 1]
    let cur = body[i]
    const dist = Math.sqrt(prev.dist2(cur))
    // console.log(dist)
    const diff = dist - jointDistance
    const d = prev.clone().sub(cur).norm().mul(diff)
    cur.add(d)
  }

  // draw
  for (const p of body) {
    canvas.circle(
      Math.mod(p.x, canvas.width),
      Math.mod(p.y, canvas.height),
      20,
      {
        fill: Color.BLACK,
        stroke: Color.BLACK,
        strokeWidth: 2,
      }
    )
  }

  canvas.load()
})

load(canvas)
