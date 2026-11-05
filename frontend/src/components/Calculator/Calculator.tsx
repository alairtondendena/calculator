import type { FormEvent } from 'react'
import { OPERATIONS } from '../../constants/operations'
import { useCalculator } from '../../hooks/useCalculator'
import { NumberField } from '../NumberField/NumberField'
import './Calculator.css'

export function Calculator() {
  const calc = useCalculator()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void calc.submit()
  }

  return (
    <main className="calculator">
      <h1>Calculator</h1>
      <form onSubmit={handleSubmit} noValidate>
        <NumberField
          id="a"
          label={calc.unary ? 'Number' : 'First number'}
          value={calc.a}
          error={calc.fieldErrors.a}
          onChange={calc.setA}
        />
        <div className="field">
          <label htmlFor="operation">Operation</label>
          <select id="operation" value={calc.operation.value} onChange={(e) => calc.setOperation(e.target.value)}>
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
        {!calc.unary && (
          <NumberField id="b" label="Second number" value={calc.b} error={calc.fieldErrors.b} onChange={calc.setB} />
        )}
        <button type="submit" disabled={calc.loading}>
          {calc.loading ? 'Calculating…' : 'Calculate'}
        </button>
      </form>
      {calc.error && <p role="alert">{calc.error}</p>}
      <output aria-live="polite" aria-label="Result">
        {calc.result}
      </output>
    </main>
  )
}
