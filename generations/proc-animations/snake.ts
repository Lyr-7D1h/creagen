import { Canvas, vec, random, Vector, Color, rng } from 'genart'

const canvas = Canvas.create()
const rand = rng()

const snake = vec(50, 50)
// pixels per millisecond
let speed = 50 / 1000
let direction = 1

let angleSpeed = 0.1
// direction of angle -1 for left, 1 for right, 0 for straightforward
let angleDirection = 1

function drw() {
  canvas.circle(snake, 20)
}

let prev = Date.now()
draw(() => {
  canvas.clear()

  if (rand.random() > 0.95) {
    angleDirection = rand.integer(-1, 1)
  }

  // change direction
  direction += angleDirection * angleSpeed

  // calculate how much to move into direction
  const now = Date.now()
  const diff = now - prev
  prev = now
  const d = vec(Math.cos(direction), Math.sin(direction))
    .clone()
    .mul(diff * speed)
  snake.add(d).wraparound([
    [0, canvas.width],
    [0, canvas.height],
  ])

  // draw
  canvas.circle(snake, 2, {
    fill: Color.create(200, 0, 200),
    stroke: Color.BLACK,
  })
  // drw()

  canvas.load()
})

load(canvas)
