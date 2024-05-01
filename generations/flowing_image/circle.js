const WIDTH = 1000;
const HEIGHT = 1000;
const SPACING = 20;
const RESOLUTION = 8;

let points = [];
for (let x = 10; x < WIDTH; x += SPACING) {
  for (let y = 10; y < HEIGHT; y += SPACING) {
    points.push([x, y]);
  }
}

// points = [[100, 100]]

const s = svg.svg({ width: WIDTH, height: HEIGHT });

const field = (x, y) => {
  return lin.narray([y - 500, -x + 500]).norm();
  // return lin.narray([Math.sin(y), Math.cos(x)])
};

const p = s.path();
for (let [x, y] of points) {
  p.moveTo(x, y);
  for (let i = 0; i < 10; i++) {
    const d = field(x, y).mul(RESOLUTION);
    x += d[0];
    y += d[1];
    p.lineTo(x, y);
  }
}

load(s);
