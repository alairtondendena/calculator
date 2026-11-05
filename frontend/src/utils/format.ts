// Hides float64 noise such as 0.1 + 0.2 = 0.30000000000000004. The API keeps the exact value.
export function formatNumber(n: number): string {
  return String(Number(n.toPrecision(12)))
}
