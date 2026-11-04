import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

async function submit(a: string, b: string) {
  const user = userEvent.setup()
  if (a) await user.type(screen.getByLabelText('First number'), a)
  if (b) await user.type(screen.getByLabelText('Second number'), b)
  await user.click(screen.getByRole('button', { name: 'Calculate' }))
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('shows the result returned by the API', async () => {
  const fetchMock = mockFetch(200, { result: 5 })
  render(<App />)

  await submit('2', '3')

  expect(await screen.findByLabelText('Result')).toHaveTextContent('5')
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/calculate',
    expect.objectContaining({ body: JSON.stringify({ operation: 'add', a: 2, b: 3 }) }),
  )
})

it('shows the error message returned by the API', async () => {
  mockFetch(400, { error: { code: 'UNKNOWN_OPERATION', message: 'unknown operation: "x"' } })
  render(<App />)

  await submit('2', '3')

  expect(await screen.findByRole('alert')).toHaveTextContent('unknown operation: "x"')
})

it('rejects invalid input without calling the API', async () => {
  const fetchMock = mockFetch(200, { result: 0 })
  render(<App />)

  await submit('abc', '')

  expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid number in both fields.')
  expect(fetchMock).not.toHaveBeenCalled()
})
