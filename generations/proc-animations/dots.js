const c = canvas.canvas();

const rng = random.xorshift();

c.circle();

c.rectangle(20, 20, 5);

const directions = [
  vec.vec(1, 0),
  vec.vec(1, 1),
  vec.vec(0, 1),
  vec.vec(-1, 1),
  vec.vec(-1, 0),
  vec.vec(-1, -1),
  vec.vec(0, -1),
  vec.vec(1, -1),
];

const p = vec.vec(rng.integer(c.width), rng.integer(c.height));

console.log(rng.integer(directions.length));
draw(() => {
  const d = directions[rng.integer(directions.length - 1)];
  p.add(d.clone().scale(20));
  p.wraparound([
    [0, c.width],
    [0, c.height],
  ]);
  c.rectangle(p, 2);
});

load(c);
