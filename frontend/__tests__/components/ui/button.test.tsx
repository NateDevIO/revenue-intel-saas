/**
 * Button Component Tests
 * =======================
 *
 * Tests for the Button UI component.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Click me</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('bg-primary')

    rerender(<Button variant="destructive">Destructive</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('border')
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('h-10')

    rerender(<Button size="sm">Small</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('h-9')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('h-11')
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
  })
})
