import { Generator } from './generator'
import { circle, path } from './svg'

const gen = new Generator({ width: '1000px', height: '1000px' })

const positions = []
for (let r = 0; r < 500; r += 0.1) {
  const theta = Math.random() * 2 * Math.PI
  const x = 500 + r * Math.cos(theta)
  const y = 500 + r * Math.sin(theta)
  positions.push([x, y])
  // gen.add(circle(3, x, y))
}

const visited = Array.from(Array(positions.length), () => new Array())
let a = Math.round(Math.random() * positions.length)

let p = ''
while (true) {
  let [x, y] = positions[a]!
  const d = positions
    .map((p, i) => [(p[0]! - x) ** 2 + (p[1]! - y) ** 2, i])
    .filter(
      ([d, i]) =>
        d !== 0 &&
        visited[i].length < 4 &&
        !visited[i].includes(a) &&
        d < 400 ** 2,
    )
    .sort((a, b) => a[0] > b[0])[0]

  if (typeof d === 'undefined') {
    break
  }

  const i = d[1]!
  const [nx, ny] = positions[i]
  p += `M${x} ${y} L${nx} ${ny}Z`
  visited[i].push(a)
  a = i
}
gen.add(path(p))

// const main = document.getElementById('main')!
// const boundingBox = main.getBoundingClientRect()
// const width = boundingBox.width
// const height = boundingBox.height
//
// let wo = width / 10
// let ho = height / 15
// for (let i = 1; i < 10; i++) {
//   let o = wo * i
//   main.appendChild(path(`M0 ${o} L${o} ${width}Z`))
//   main.appendChild(path(`M0 ${o + 5} L${o} ${width}Z`))
//   main.appendChild(path(`M0 ${o + 10} L${o} ${width}Z`))
//
//   main.appendChild(path(`M${width} ${o} L${width - o} ${width}Z`))
//   main.appendChild(path(`M${width} ${o + 5} L${width - o} ${width}Z`))
//   main.appendChild(path(`M${width} ${o + 10} L${width - o} ${width}Z`))
// }
