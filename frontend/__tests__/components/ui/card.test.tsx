/**
 * Card Component Tests
 * =====================
 *
 * Tests for Card UI components.
 */

import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Components', () => {
  it('renders card with all sub-components', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Test Content</p>
        </CardContent>
        <CardFooter>
          <p>Test Footer</p>
        </CardFooter>
      </Card>
    )

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByText('Test Footer')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>)
    const card = screen.getByTestId('card')
    expect(card.className).toContain('custom-class')
  })

  it('renders CardTitle with correct heading level', () => {
    render(<CardTitle>My Title</CardTitle>)
    const title = screen.getByText('My Title')
    expect(title.tagName).toBe('H3')
  })
})
