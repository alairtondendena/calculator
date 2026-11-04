import { describe, expect, it } from 'vitest'
import { formatNumber, parseOperand } from './numbers'

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    ['-3.5', -3.5],
    ['+2', 2],
    ['.5', 0.5],
    ['5.', 5],
    ['1e3', 1000],
    ['  7  ', 7],
    ['0', 0],
  ])('parses %j', (raw, want) => {
    expect(parseOperand(raw)).toEqual({ value: want })
  })

  it.each([
    ['', 'Enter a number.'],
    ['   ', 'Enter a number.'],
    ['abc', 'Enter a valid number, using a dot for decimals.'],
    ['1,5', 'Enter a valid number, using a dot for decimals.'],
    ['0x10', 'Enter a valid number, using a dot for decimals.'],
    ['Infinity', 'Enter a valid number, using a dot for decimals.'],
    ['1-2', 'Enter a valid number, using a dot for decimals.'],
    ['1e400', 'Number is too large.'],
  ])('rejects %j', (raw, error) => {
    expect(parseOperand(raw)).toEqual({ error })
  })
})

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
