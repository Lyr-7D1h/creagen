export class Bitmap {
  static create(width: number, height: number) {
    return new Bitmap(
      width,
      height,
      new Uint8Array(Math.ceil((width * height) / 8)),
    )
  }

  static fromUnit8array(width, height, data: Uint8Array) {
    return new Bitmap(width, height, data)
  }

  constructor(
    private width,
    private height,
    private data: Uint8Array,
  ) {}

  // Compute bit index for (x, y)
  _index(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new RangeError(`Coordinates (${x}, ${y}) out of bounds`)
    }
    return y * this.width + x
  }

  // Get bit value at (x, y)
  get(x, y) {
    const i = this._index(x, y)
    const byteIndex = i >> 3 // divide by 8
    const bitIndex = i & 7 // modulo 8
    return ((this.data[byteIndex] >> bitIndex) & 1) > 0
  }

  // Set bit at (x, y) to value (0 or 1)
  set(x, y, value: boolean) {
    const i = this._index(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    if (value) {
      this.data[byteIndex] |= 1 << bitIndex // set bit
    } else {
      this.data[byteIndex] &= ~(1 << bitIndex) // clear bit
    }
  }

  // Toggle bit at (x, y)
  toggle(x, y) {
    const i = this._index(x, y)
    const byteIndex = i >> 3
    const bitIndex = i & 7
    this.data[byteIndex] ^= 1 << bitIndex
  }

  // Pretty print bitmap (# for 1, . for 0)
  print() {
    for (let y = 0; y < this.height; y++) {
      let row = ''
      for (let x = 0; x < this.width; x++) {
        row += this.get(x, y) ? '#' : '.'
      }
      console.log(row)
    }
  }
}
