# Genart

# Usage

```sh
cd genart
npm install
npm run build

cd ../genart-editor
npm install
npm start
```

# Roadmap

## Editor:

- Project management
  - List sketches
  - Name sketches
  - View history of sketch
- Import code using ID `import('a123487e...')
- Crop, compress and convert dropped images to base64 string
- P5 support
- Make Settings moveable
- Typescript support
- Show only sandbox keybind/setting
- Html meta tags
- Autoimport libraries 
  - Import typings from npm https://lukasbach.github.io/monaco-editor-auto-typings/docs/

## Library:

- Reduce svg size (https://www.svgviewer.dev/)
- Treat svg paths as vertex (https://baku89.github.io/pave/guide.html) and allow linear operations on it
- Gcode support

# Resources
**Library**
- https://github.com/anvaka/fieldplay
Math:
- https://mathjs.org/docs/reference/functions.html#matrix-functions
- http://sylvester.jcoglan.com/api/vector.html#create
- https://github.com/scijs/ndarray
**Reading**
- https://en.wikipedia.org/wiki/Tessellation
- https://en.wikipedia.org/wiki/Random_walk
- https://en.wikipedia.org/wiki/Loop-erased_random_walk
- http://xahlee.info/math/algorithmic_math_art.html
- https://en.wikipedia.org/wiki/OpenSimplex_noise

# Useful urls
PNG to Base64:
https://base64.guru/converter/encode/image/png