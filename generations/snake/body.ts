import { Canvas, vec, Color, Random, Math } from 'genart'

const POINT_DISTANCE = 50
const BODY_LENGTH = 20
const DEBUG = false

const canvas = Canvas.create()

const body = [vec(50, 50)]
for (let i = 1; i < BODY_LENGTH; i++) {
  // const r = Math.random() * 0.4
  // const x = body[i - 1].x + Math.cos(r) * POINT_DISTANCE
  // const y = body[i - 1].y + Math.sin(r) * POINT_DISTANCE
  const x = POINT_DISTANCE * (i + 1)
  const y = 50
  body.push(vec(x, y))
}

function drawSnake() {
  // build snake outline
  const left = []
  const right = []
  for (let i = 1; i < body.length; i++) {
    const d = body[i]
      .clone()
      .sub(body[i - 1])
      .norm()
    const per = vec(-d.y, d.x)
    if (i == BODY_LENGTH - 1) {
      per.mul(22)
    } else {
      let shrinkPercentage = i / (0.2 * BODY_LENGTH)
      if (shrinkPercentage > 1) {
        shrinkPercentage = 1
      }
      per.mul(shrinkPercentage * 15)
    }
    const a = body[i - 1].clone().add(per)
    const b = body[i - 1].clone().add(per.mul(-1))
    if (DEBUG) {
      canvas.circle(a, 2)
      canvas.circle(b, 2)
      canvas.circle(body[i - 1], 2)
    }
    left.push(a)
    right.push(b)
  }
  right.reverse()
  const outline = [
    body[0].clone(),
    ...left,
    body[BODY_LENGTH - 1],
    ...right,
    body[0].clone(),
  ]
  for (let i = 0; i < outline.length; i++) {
    outline[i].x = Math.mod(outline[i].x, canvas.width)
    outline[i].y = Math.mod(outline[i].y, canvas.height)
  }
  canvas.path({ smooth: true, closed: true }).add(outline)
}

// Velocity vector in polar coordinates
// [angle, velocity]
let velocity = vec(0, 50 / 1000)
let maxVelocity = 200 / 1000
let angularVelocity = (1 / 4) * Math.PI
let acceleration = 0.0001

draw((dt) => {
  canvas.clear()

  // change direction
  if (Math.random() > 0.95) {
    angularVelocity = (Random.integer(-1, 1) * 2) / 1000
  }
  if (Random.random() > 0.95) {
    acceleration = Random.integer(-1, 1) * 0.0001
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
    const diff = dist - POINT_DISTANCE
    const d = prev.clone().sub(cur).norm().mul(diff)
    cur.add(d)
  }

  // draw
  body.reverse()
  drawSnake()
  body.reverse()
  canvas.load()
})

load(canvas)
