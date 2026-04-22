/** https://en.wikipedia.org/wiki/Tridiagonal_matrix_algorithm */
export function solveTriadiagonalMatrix(
  A: [number, number, number][],
  b: number[],
): number[] {
  const n = A.length
  for (let i = 1; i < n; i++) {
    const m = A[i][0] / A[i - 1][1]
    A[i][1] -= m * A[i - 1][2]
    b[i] -= m * b[i - 1]
  }

  const x = new Array<number>(n)
  x[n - 1] = b[n - 1] / A[n - 1][1]
  for (let i = A.length - 2; i >= 0; --i) {
    x[i] = (b[i] - A[i][2] * x[i + 1]) / A[i][1]
  }
  return x
}
