import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Calculator } from './Calculator'

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

function requestBody(fetchMock: ReturnType<typeof mockFetch>) {
  return JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
}

type User = ReturnType<typeof userEvent.setup>

async function fill({ a, op, b }: { a?: string; op?: string; b?: string }) {
  const user = userEvent.setup()
  if (op) await user.selectOptions(screen.getByLabelText('Operation'), op)
  if (a) await user.type(screen.getByLabelText(/^(First number|Number)$/), a)
  if (b) await user.type(screen.getByLabelText('Second number'), b)
  return user
}

async function submit(fields: Parameters<typeof fill>[0]) {
  const user = await fill(fields)
  await user.click(screen.getByRole('button', { name: 'Calculate' }))
  return user
}

afterEach(() => {
  vi.restoreAllMocks()
})

it('shows the expression and the result returned by the API', async () => {
  const fetchMock = mockFetch(200, { result: 5 })
  render(<Calculator />)

  await submit({ a: '2', b: '3' })

  expect(await screen.findByLabelText('Result')).toHaveTextContent('2 + 3 = 5')
  expect(requestBody(fetchMock)).toEqual({ operation: 'add', a: 2, b: 3 })
})

it.each([
  ['subtract', '2 − 3 = -1', -1],
  ['multiply', '2 × 3 = 6', 6],
  ['divide', '2 ÷ 3 = 0.666666666667', 2 / 3],
  ['power', '2 ^ 3 = 8', 8],
  ['percentage', '2% of 3 = 0.06', 0.06],
])('sends %s and formats the result', async (op, expected, result) => {
  const fetchMock = mockFetch(200, { result })
  render(<Calculator />)

  await submit({ a: '2', op, b: '3' })

  expect(await screen.findByLabelText('Result')).toHaveTextContent(expected)
  expect(requestBody(fetchMock)).toEqual({ operation: op, a: 2, b: 3 })
})

it('hides the second number for square root and omits b from the request', async () => {
  const fetchMock = mockFetch(200, { result: 3 })
  render(<Calculator />)

  await submit({ op: 'sqrt', a: '9' })

  expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument()
  expect(await screen.findByLabelText('Result')).toHaveTextContent('√9 = 3')
  expect(requestBody(fetchMock)).toEqual({ operation: 'sqrt', a: 9 })
})

it('hides floating-point noise in the result', async () => {
  mockFetch(200, { result: 0.30000000000000004 })
  render(<Calculator />)

  await submit({ a: '0.1', b: '0.2' })

  expect(await screen.findByLabelText('Result')).toHaveTextContent('0.1 + 0.2 = 0.3')
})

it.each([
  ['DIVISION_BY_ZERO', 'Cannot divide by zero.'],
  ['NEGATIVE_SQUARE_ROOT', 'Cannot take the square root of a negative number.'],
  ['NON_FINITE_RESULT', 'The result is too large or undefined.'],
  ['SOMETHING_NEW', 'message from the API'],
])('shows a user-facing message for API error %s', async (code, message) => {
  mockFetch(422, { error: { code, message: 'message from the API' } })
  render(<Calculator />)

  await submit({ a: '1', b: '0' })

  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(screen.getByLabelText('Result')).toBeEmptyDOMElement()
})
it('validates each field without calling the API', async () => {
  const fetchMock = mockFetch(200, { result: 0 })
  render(<Calculator />)

  await submit({ b: '1,5' })

  const a = screen.getByLabelText('First number')
  const b = screen.getByLabelText('Second number')
  expect(a).toHaveAttribute('aria-invalid', 'true')
  expect(a).toHaveAccessibleDescription('Enter a number.')
  expect(b).toHaveAccessibleDescription('Enter a valid number, using a dot for decimals.')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('clears a field error when the field is edited', async () => {
  mockFetch(200, { result: 0 })
  render(<Calculator />)
  const user = await submit({})

  await user.type(screen.getByLabelText('First number'), '1')

  expect(screen.getByLabelText('First number')).not.toHaveAttribute('aria-invalid')
  expect(screen.getByLabelText('Second number')).toHaveAttribute('aria-invalid', 'true')
})

it.each([
  ['editing a field', (user: User) => user.type(screen.getByLabelText('Second number'), '2')],
  ['changing the operation', (user: User) => user.selectOptions(screen.getByLabelText('Operation'), 'multiply')],
])('clears the API error when %s', async (_, change) => {
  mockFetch(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero' } })
  render(<Calculator />)
  const user = await submit({ a: '1', op: 'divide', b: '0' })
  await screen.findByRole('alert')

  await change(user)

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('disables the button while the request is in flight', async () => {
  vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))
  render(<Calculator />)

  await submit({ a: '1', b: '2' })

  expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled()
})
