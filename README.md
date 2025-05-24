# Creagen

A general purpose library meant for creative coding.

This library tailors more to experienced programmers with a focus on good function semantics and reuse of code and concepts.

> [!CAUTION]
> This is a highly experimental library and is very sensitive to future changes
> I implement a lot of algorithms here myself as a learning experience so don't expect
> the smoothest of performance.

# Build

```sh
npm install
npm run build
```

# Roadmap

- Reduce svg size (https://www.svgviewer.dev/)
- Treat svg paths as vertex (https://baku89.github.io/pave/guide.html) and allow linear operations on it
- Audio 
    - Generation
    - Modification
        - Panning/gain https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API
    - Realtime analysis
        - Common Audio Features: https://meyda.js.org/
        - Bpm: https://www.npmjs.com/package/realtime-bpm-analyzer
- Gcode support
- Webassembly for cpu heavy stuff
- 3d Graphics
    - glTF format support (format for 3d models and skeleton animations)
- GPU accelerated tensors (https://www.tensorflow.org/js/guide/platform_environment)
  - When webgpu is supported on all major devices (https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
  - WebGPU has compute shaders which WebGL does not have 
  - https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-webgpu
  - Comment on fast geometry in browser: https://www.reddit.com/r/webdev/comments/1ddpr9p/comment/l87gk60/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button


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
