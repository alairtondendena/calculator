import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333'],
    [5, '5'],
    [-2.5, '-2.5'],
    [1e21, '1e+21'],
    [Math.SQRT2, '1.41421356237'],
  ])('formats %d as %s', (n, want) => {
    expect(formatNumber(n)).toBe(want)
  })
})
