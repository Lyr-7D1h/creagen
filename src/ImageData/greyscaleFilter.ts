export function greyscaleFilter(pixeldata: Uint8ClampedArray<ArrayBufferLike>) {
  for (let i = 0; i < pixeldata.length; i += 4) {
    // Calculate luminance using standard RGB to grayscale conversion
    const grey = Math.round(
      0.299 * pixeldata[i] + // Red
        0.587 * pixeldata[i + 1] + // Green
        0.114 * pixeldata[i + 2], // Blue
    )

    pixeldata[i] = grey
    pixeldata[i + 1] = grey
    pixeldata[i + 2] = grey
  }
}
