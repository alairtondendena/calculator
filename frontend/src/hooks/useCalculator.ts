import { useState } from 'react'
import { OPERATIONS } from '../constants/operations'
import { ApiError, calculate } from '../services/calculatorApi'
import type { OperationInfo } from '../types/calculator'
import { formatNumber } from '../utils/format'
import { parseOperand } from '../utils/validation'

// User-facing text for the API errors a user can trigger from the form.
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

export interface FieldErrors {
  a?: string
  b?: string
}

// Form state and submission for the calculator. Keeps the component presentational.
export function useCalculator() {
  const [operation, setOperationInfo] = useState<OperationInfo>(OPERATIONS[0])
  const [a, setAValue] = useState('')
  const [b, setBValue] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const unary = operation.arity === 1

  function setOperand(field: keyof FieldErrors, value: string) {
    if (field === 'a') setAValue(value)
    else setBValue(value)
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    setError(null)
  }

  function setOperation(value: string) {
    setOperationInfo(OPERATIONS.find((op) => op.value === value) ?? OPERATIONS[0])
    setFieldErrors((prev) => ({ ...prev, b: undefined }))
    setError(null)
  }

  async function submit() {
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

  return {
    operation,
    unary,
    a,
    b,
    fieldErrors,
    result,
    error,
    loading,
    setA: (value: string) => setOperand('a', value),
    setB: (value: string) => setOperand('b', value),
    setOperation,
    submit,
  }
}
