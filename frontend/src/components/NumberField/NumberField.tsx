interface NumberFieldProps {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}

export function NumberField({ id, label, value, error, onChange }: NumberFieldProps) {
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
