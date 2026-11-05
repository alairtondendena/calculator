import type { CalculateRequest } from '../types/calculator'

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export async function calculate(req: CalculateRequest): Promise<number> {
  let res: Response
  try {
    res = await fetch('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Could not reach the server. Try again.')
  }
  // A proxy or network error may not return JSON.
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(
      body?.error?.code ?? 'UNEXPECTED_RESPONSE',
      body?.error?.message ?? `Request failed with status ${res.status}`,
    )
  }
  if (typeof body?.result !== 'number') {
    throw new ApiError('UNEXPECTED_RESPONSE', 'Unexpected response from the server.')
  }
  return body.result
}
