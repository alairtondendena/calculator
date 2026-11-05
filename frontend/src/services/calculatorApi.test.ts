import { afterEach, expect, it, vi } from 'vitest'
import { ApiError, calculate } from './calculatorApi'

afterEach(() => {
  vi.restoreAllMocks()
})

function mockFetchResponse(status: number, body: string) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status }))
}

it('posts the request and returns the result', async () => {
  const fetchMock = mockFetchResponse(200, '{"result":3}')

  await expect(calculate({ operation: 'sqrt', a: 9 })).resolves.toBe(3)
  expect(fetchMock).toHaveBeenCalledWith('/api/v1/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"operation":"sqrt","a":9}',
  })
})

it('throws the error code and message from the API', async () => {
  mockFetchResponse(422, '{"error":{"code":"DIVISION_BY_ZERO","message":"division by zero"}}')

  await expect(calculate({ operation: 'divide', a: 1, b: 0 })).rejects.toEqual(
    new ApiError('DIVISION_BY_ZERO', 'division by zero'),
  )
})

it('handles error responses that are not JSON', async () => {
  mockFetchResponse(502, 'Bad Gateway')

  const err = await calculate({ operation: 'add', a: 1, b: 2 }).catch((e: unknown) => e)
  expect(err).toBeInstanceOf(ApiError)
  expect(err).toMatchObject({ code: 'UNEXPECTED_RESPONSE', message: 'Request failed with status 502' })
})

it.each([
  ['not JSON', 'OK'],
  ['missing result', '{}'],
])('rejects a successful response that is %s', async (_, body) => {
  mockFetchResponse(200, body)

  await expect(calculate({ operation: 'add', a: 1, b: 2 })).rejects.toMatchObject({
    code: 'UNEXPECTED_RESPONSE',
    message: 'Unexpected response from the server.',
  })
})

it('reports network failures', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

  await expect(calculate({ operation: 'add', a: 1, b: 2 })).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
    message: 'Could not reach the server. Try again.',
  })
})
