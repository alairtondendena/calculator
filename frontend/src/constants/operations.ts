import type { OperationInfo } from '../types/calculator'

// Mirrors the backend registry. The backend remains the source of truth for validation.
export const OPERATIONS: readonly OperationInfo[] = [
  { value: 'add', label: 'Add (+)', arity: 2, expression: (a, b) => `${a} + ${b}` },
  { value: 'subtract', label: 'Subtract (−)', arity: 2, expression: (a, b) => `${a} − ${b}` },
  { value: 'multiply', label: 'Multiply (×)', arity: 2, expression: (a, b) => `${a} × ${b}` },
  { value: 'divide', label: 'Divide (÷)', arity: 2, expression: (a, b) => `${a} ÷ ${b}` },
  { value: 'power', label: 'Power (xʸ)', arity: 2, expression: (a, b) => `${a} ^ ${b}` },
  { value: 'sqrt', label: 'Square root (√)', arity: 1, expression: (a) => `√${a}` },
  { value: 'percentage', label: 'Percentage (a% of b)', arity: 2, expression: (a, b) => `${a}% of ${b}` },
]
