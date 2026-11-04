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

// Hides float64 noise such as 0.1 + 0.2 = 0.30000000000000004. The API keeps the exact value.
export function formatNumber(n: number): string {
  return String(Number(n.toPrecision(12)))
}
