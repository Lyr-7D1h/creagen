const WIDTH = 1200;
const HEIGHT = 675;
const s = svg.svg({ width: WIDTH, height: HEIGHT });

const code =
  'let WIDTH=1200,HEIGHT=675,s=svg.svg({width:1200,height:675}),code="",SCREEN_CHARACTER_WIDTH=180,ITERATIONS=500,PART_SIZE=1,OPACITY_GROWTH_RATE=20,amp=100,freq=1/30,yshift=0,xshift=0;function noise(t,e,o){return e||(e=10),o||(o=10),(.5>Math.random()?-1:1)*t*random.beta(e,o)}let mods=[];for(let i=0;i<500;i++){let t=180+-360*Math.random(),e="".substring(t,t+180);amp+=noise(30,80,20),freq+=noise(1/300,1,70),yshift+=noise(10,50,20),xshift+=noise(1/3,10,10),mods.push({amp,freq,yshift,xshift});for(let t=0;t<180;t+=1){let o=0;for(let{amp:e,freq:n,yshift:h,xshift:f}of mods)o=e*Math.sin(t*n+1/300*o+f)+h;let n=337.5+o;s.text({content:e.substring(t,t+1),x:`${t}ch`,y:n,fontWeight:"bold",fillOpacity:.08+.92*Math.E**(20*(i+1)/500-20)})}}container.appendChild(s.html());';

const SCREEN_CHARACTER_WIDTH = 180;
const ITERATIONS = 500;
const PART_SIZE = 1;
const OPACITY_GROWTH_RATE = 20;

let amp = 100;
let freq = 1 / 30;
let yshift = 0;
let xshift = 0;

function noise(max, a, b) {
  if (!a) {
    a = 10;
  }
  if (!b) {
    b = 10;
  }
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * max * random.beta(a, b);
}

// {amp, freq, xshift, yshift}
const mods = [];

for (let i = 0; i < ITERATIONS; i++) {
  const range =
    SCREEN_CHARACTER_WIDTH +
    Math.random() * (code.length - 2 * SCREEN_CHARACTER_WIDTH);
  const content = code.substring(range, range + SCREEN_CHARACTER_WIDTH);

  amp += noise(30, 80, 20);
  freq += noise(1 / 300, 1, 70);
  yshift += noise(10, 50, 20);
  xshift += noise(1 / 3, 10, 10);

  mods.push({ amp, freq, yshift, xshift });

  for (let j = 0; j < SCREEN_CHARACTER_WIDTH; j += PART_SIZE) {
    let offset = 0;
    // sine wave modulation
    for (const { amp, freq, yshift, xshift } of mods) {
      offset = amp * Math.sin(j * freq + (1 / 300) * offset + xshift) + yshift;
    }

    const y = HEIGHT / 2 + offset;

    s.text({
      content: content.substring(j, j + PART_SIZE),
      x: `${j}ch`,
      y: y.toFixed(3),
      fontWeight: "bold",
      // e ^ (growth_rate * percentage - growth_rate)
      fillOpacity: (
        0.08 +
        0.92 *
          Math.E **
            ((OPACITY_GROWTH_RATE * (i + 1)) / ITERATIONS - OPACITY_GROWTH_RATE)
      ).toFixed(3),
    });
  }
}

container.appendChild(s.html());
