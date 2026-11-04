// TODO: subtract, multiply, divide and the optional operations, mirroring the backend registry.
export type Operation = 'add'

export interface CalculateRequest {
  operation: Operation
  a: number
  b: number
}

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export async function calculate(req: CalculateRequest): Promise<number> {
  const res = await fetch('/api/v1/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  // A proxy or network error may not return JSON.
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? 'UNEXPECTED_RESPONSE',
      body?.error?.message ?? `Request failed with status ${res.status}`,
    )
  }
  return body.result
}
