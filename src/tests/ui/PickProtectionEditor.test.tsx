import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PickProtectionEditor } from '@/components/trade/PickProtectionEditor'

describe('PickProtectionEditor', () => {
  it('renders read-only badge when canEdit is false', () => {
    render(
      <PickProtectionEditor
        pickId="p1"
        protection="1-10"
        canEdit={false}
        onSave={() => undefined}
      />,
    )
    expect(screen.getByText(/top-1-10/)).toBeInTheDocument()
  })

  it('clicking badge enters edit mode and saves on Enter', () => {
    const onSave = vi.fn()
    render(
      <PickProtectionEditor
        pickId="p1"
        protection="1-10"
        canEdit
        onSave={onSave}
      />,
    )
    const badge = screen.getByText(/top-1-10/)
    fireEvent.click(badge)
    const input = screen.getByPlaceholderText(/1-10/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '1-5' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('p1', '1-5')
  })

  it('saving with empty string passes null to clear protection', () => {
    const onSave = vi.fn()
    render(
      <PickProtectionEditor
        pickId="p1"
        protection="1-10"
        canEdit
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByText(/top-1-10/))
    const input = screen.getByPlaceholderText(/1-10/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('p1', null)
  })

  it('Escape key cancels edit and reverts', () => {
    const onSave = vi.fn()
    render(
      <PickProtectionEditor
        pickId="p1"
        protection="1-10"
        canEdit
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByText(/top-1-10/))
    const input = screen.getByPlaceholderText(/1-10/) as HTMLInputElement
    fireEvent.change(input, { target: { value: '1-3' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
  })
})
