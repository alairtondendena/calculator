export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage'

export interface CalculateRequest {
  operation: Operation
  a: number
  // Omitted for unary operations (sqrt).
  b?: number
}

export interface OperationInfo {
  value: Operation
  label: string
  arity: 1 | 2
  expression: (a: number, b: number) => string
}
