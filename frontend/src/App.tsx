import { useState, type FormEvent } from 'react'
import { calculate, type Operation } from './api'

const OPERATIONS: { value: Operation; label: string }[] = [{ value: 'add', label: '+' }]

function parseOperand(value: string): number | null {
  const n = Number(value)
  return value.trim() === '' || !Number.isFinite(n) ? null : n
}

export default function App() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [operation, setOperation] = useState<Operation>('add')
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setError(null)

    const x = parseOperand(a)
    const y = parseOperand(b)
    if (x === null || y === null) {
      setError('Enter a valid number in both fields.')
      return
    }

    setLoading(true)
    try {
      setResult(await calculate({ operation, a: x, b: y }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="calculator">
      <h1>Calculator</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          First number
          <input inputMode="decimal" value={a} onChange={(e) => setA(e.target.value)} />
        </label>
        <label>
          Operation
          <select value={operation} onChange={(e) => setOperation(e.target.value as Operation)}>
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second number
          <input inputMode="decimal" value={b} onChange={(e) => setB(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </form>
      <output aria-live="polite" aria-label="Result">
        {result}
      </output>
      {error && <p role="alert">{error}</p>}
    </main>
  )
}
