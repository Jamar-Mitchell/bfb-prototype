import { zodResolver } from '@hookform/resolvers/zod'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../lib/api/errors'
import { applyApiFieldErrors } from '../../lib/forms/applyApiFieldErrors'
import { SelectField, TextareaField, TextField } from '.'

const schema = z.object({
  businessName: z.string().min(2, 'Enter your business name.'),
  email: z.email('Enter a valid email address.'),
  category: z.string().min(1, 'Choose a category.'),
  description: z.string().max(200),
})

type Values = z.infer<typeof schema>

function SampleForm({ onSubmit }: { onSubmit: (values: Values) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { businessName: '', email: '', category: '', description: '' },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      applyApiFieldErrors(error, setError, { fieldMap: { business_name: 'businessName' } })
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <TextField label="Business name" hint="As customers know it." required error={errors.businessName?.message} {...register('businessName')} />
      <TextField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      <SelectField
        label="Category"
        placeholder="Choose a category"
        options={[{ value: 'design', label: 'Design' }]}
        error={errors.category?.message}
        {...register('category')}
      />
      <TextareaField label="Description" error={errors.description?.message} {...register('description')} />
      <button type="submit">Save</button>
    </form>
  )
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Business name/), { target: { value: 'Northstar Digital' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hello@northstar.test' } })
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'design' } })
}

describe('form fields with React Hook Form', () => {
  afterEach(cleanup)

  it('ties labels and hints to inputs', () => {
    render(<SampleForm onSubmit={vi.fn()} />)

    const input = screen.getByLabelText(/Business name/)
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAccessibleDescription('As customers know it.')
  })

  it('shows Zod field errors and does not submit', async () => {
    const onSubmit = vi.fn()
    render(<SampleForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription('Enter a valid email address.')
    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose a category.')
    expect(screen.getByLabelText(/Business name/)).toHaveAccessibleDescription(
      'As customers know it. Enter your business name.',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows field errors returned by the API', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError({
        code: 'validation_error',
        message: 'Request validation failed.',
        status: 422,
        fieldErrors: [
          { field: 'email', message: 'That email is already registered.', type: 'value_error' },
          { field: 'business_name', message: 'That name is taken.', type: 'value_error' },
        ],
      }),
    )
    render(<SampleForm onSubmit={onSubmit} />)

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(email).toHaveAccessibleDescription('That email is already registered.')
    expect(screen.getByLabelText(/Business name/)).toHaveAccessibleDescription('As customers know it. That name is taken.')
    expect(email).toHaveFocus()
  })
})

describe('applyApiFieldErrors', () => {
  it('returns errors that match no known field', () => {
    const setError = vi.fn()
    const error = new ApiError({
      code: 'validation_error',
      message: 'Invalid.',
      fieldErrors: [
        { field: 'email', message: 'Bad email.', type: 'value_error' },
        { field: 'unknown', message: 'Mystery.', type: 'value_error' },
      ],
    })

    const unmatched = applyApiFieldErrors<Values>(error, setError, { knownFields: ['email'] })

    expect(setError).toHaveBeenCalledOnce()
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Bad email.' }, { shouldFocus: true })
    expect(unmatched).toEqual([{ field: 'unknown', message: 'Mystery.', type: 'value_error' }])
  })

  it('ignores errors that are not API validation errors', () => {
    const setError = vi.fn()
    expect(applyApiFieldErrors(new Error('boom'), setError)).toEqual([])
    expect(setError).not.toHaveBeenCalled()
  })
})
