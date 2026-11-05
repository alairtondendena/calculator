// Plain decimal notation with optional sign and exponent. Number() alone would
// also accept hex ("0x10") and "Infinity".
const DECIMAL = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i

export type ParsedOperand = { value: number } | { error: string }

export function parseOperand(raw: string): ParsedOperand {
  const text = raw.trim()
  if (text === '') return { error: 'Enter a number.' }
  if (!DECIMAL.test(text)) return { error: 'Enter a valid number, using a dot for decimals.' }
  const value = Number(text)
  if (!Number.isFinite(value)) return { error: 'Number is too large.' }
  return { value }
}
