import { useState, type FormEvent } from 'react'
import { ApiError, calculate } from './api'
import { formatNumber, parseOperand } from './numbers'
import { OPERATIONS, type OperationInfo } from './operations'

// User-facing text for the API errors a user can trigger from this form.
// Other codes fall back to the API message.
const ERROR_MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero.',
  NEGATIVE_SQUARE_ROOT: 'Cannot take the square root of a negative number.',
  NON_FINITE_RESULT: 'The result is too large or undefined.',
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return ERROR_MESSAGES[err.code] ?? err.message
  return 'Unexpected error.'
}

interface FieldErrors {
  a?: string
  b?: string
}

export default function App() {
  const [operation, setOperation] = useState<OperationInfo>(OPERATIONS[0])
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const unary = operation.arity === 1

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setResult(null)
    setError(null)

    const x = parseOperand(a)
    const y = unary ? null : parseOperand(b)
    setFieldErrors({
      a: 'error' in x ? x.error : undefined,
      b: y && 'error' in y ? y.error : undefined,
    })
    if ('error' in x || (y && 'error' in y)) return

    setLoading(true)
    try {
      const value = await calculate({ operation: operation.value, a: x.value, b: y?.value })
      setResult(`${operation.expression(x.value, y?.value ?? 0)} = ${formatNumber(value)}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleOperationChange(value: string) {
    setOperation(OPERATIONS.find((op) => op.value === value) ?? OPERATIONS[0])
    setFieldErrors((prev) => ({ ...prev, b: undefined }))
  }

  return (
    <main className="calculator">
      <h1>Calculator</h1>
      <form onSubmit={handleSubmit} noValidate>
        <NumberField
          id="a"
          label={unary ? 'Number' : 'First number'}
          value={a}
          error={fieldErrors.a}
          onChange={(value) => {
            setA(value)
            setFieldErrors((prev) => ({ ...prev, a: undefined }))
          }}
        />
        <div className="field">
          <label htmlFor="operation">Operation</label>
          <select id="operation" value={operation.value} onChange={(e) => handleOperationChange(e.target.value)}>
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
        {!unary && (
          <NumberField
            id="b"
            label="Second number"
            value={b}
            error={fieldErrors.b}
            onChange={(value) => {
              setB(value)
              setFieldErrors((prev) => ({ ...prev, b: undefined }))
            }}
          />
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <output aria-live="polite" aria-label="Result">
        {result}
      </output>
    </main>
  )
}

interface NumberFieldProps {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}

function NumberField({ id, label, value, error, onChange }: NumberFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {/* No inputMode="decimal": the iOS decimal keypad has no minus sign. */}
      <input
        id={id}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
