# Frontend Component Tests

## Overview

Frontend test suite using Jest and React Testing Library for the SaaS Revenue Lifecycle Analyzer.

## Test Structure

```
frontend/__tests__/
├── components/
│   └── ui/
│       ├── button.test.tsx     # Button component tests
│       └── card.test.tsx        # Card component tests
└── lib/
    └── utils.test.ts            # Utility function tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Watch Mode (re-run on changes)

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

This generates an HTML coverage report in `coverage/lcov-report/index.html`

## Test Configuration

### Jest Config (`jest.config.js`)

- Uses Next.js Jest configuration
- Test environment: jsdom (browser-like environment)
- Module path mapping: `@/*` resolves to project root
- Coverage collection from `app/`, `components/`, and `lib/` directories

### Setup File (`jest.setup.js`)

- Imports `@testing-library/jest-dom` for additional matchers
- Provides custom matchers like `toBeInTheDocument()`, `toHaveClass()`, etc.

## Writing Tests

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Hello" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles interactions', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()

    render(<MyComponent onClick={handleClick} />)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Utility Function Test Example

```typescript
import { formatCurrency } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formats numbers as currency', () => {
    expect(formatCurrency(1000)).toBe('$1,000')
    expect(formatCurrency(1500.5)).toBe('$1,501')
  })
})
```

## Test Coverage

### Current Coverage

Run `npm run test:coverage` to see detailed coverage report.

### Coverage Goals

- **Target**: 70%+ overall coverage
- **Critical Components**: 90%+ coverage for:
  - Utility functions
  - UI components
  - Data formatting functions

## Available Test Utilities

### From `@testing-library/react`

- `render()` - Render React components
- `screen` - Query rendered elements
- `waitFor()` - Wait for async operations
- `within()` - Scope queries to specific elements

### From `@testing-library/user-event`

- `user.click()` - Simulate clicks
- `user.type()` - Simulate typing
- `user.keyboard()` - Simulate keyboard events
- `user.hover()` - Simulate hover

### From `@testing-library/jest-dom`

- `toBeInTheDocument()` - Element exists in DOM
- `toHaveClass()` - Element has CSS class
- `toBeDisabled()` - Element is disabled
- `toHaveAttribute()` - Element has attribute
- `toHaveTextContent()` - Element has text

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - testing implementation details
expect(component.state.isOpen).toBe(true)

// ✅ Good - testing user-visible behavior
expect(screen.getByRole('dialog')).toBeVisible()
```

### 2. Use Semantic Queries

Priority order:
1. `getByRole` - Most accessible
2. `getByLabelText` - For form elements
3. `getByPlaceholderText` - For inputs
4. `getByText` - For non-interactive elements
5. `getByTestId` - Last resort

```typescript
// ✅ Good - semantic query
screen.getByRole('button', { name: /submit/i })

// ❌ Bad - implementation detail
screen.getByTestId('submit-btn')
```

### 3. Test Accessibility

```typescript
it('is accessible', () => {
  render(<Button>Click me</Button>)

  // Check ARIA attributes
  const button = screen.getByRole('button')
  expect(button).toHaveAttribute('aria-label')

  // Check keyboard navigation
  expect(button).toHaveFocus()
})
```

### 4. Mock External Dependencies

```typescript
// Mock API calls
jest.mock('@/lib/api', () => ({
  getCustomers: jest.fn(() => Promise.resolve({ data: [] }))
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}))
```

## Common Testing Patterns

### Testing Forms

```typescript
it('submits form data', async () => {
  const user = userEvent.setup()
  const handleSubmit = jest.fn()

  render(<MyForm onSubmit={handleSubmit} />)

  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
  })
})
```

### Testing Async Operations

```typescript
it('loads data asynchronously', async () => {
  render(<DataComponent />)

  // Show loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText(/loaded data/i)).toBeInTheDocument()
  })
})
```

### Testing Conditional Rendering

```typescript
it('shows error message on failure', () => {
  const { rerender } = render(<Component error={null} />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  rerender(<Component error="Something went wrong" />)
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
})
```

## Debugging Tests

### View Rendered HTML

```typescript
import { screen } from '@testing-library/react'

it('test', () => {
  render(<Component />)

  // Print entire DOM
  screen.debug()

  // Print specific element
  screen.debug(screen.getByRole('button'))
})
```

### Check Available Queries

```typescript
import { logRoles } from '@testing-library/react'

it('test', () => {
  const { container } = render(<Component />)
  logRoles(container) // Shows all available roles
})
```

## Troubleshooting

### "Unable to find role"

- Element may not be rendered yet (use `await waitFor()`)
- Element may be hidden (check visibility)
- Element may not have the expected role (use `logRoles()`)

### "Not wrapped in act()"

- Async state updates need `await waitFor()`
- User interactions need `await user.click()` (not `userEvent.click()`)

### Module Not Found

- Check path aliases in `jest.config.js`
- Ensure files are included in `testMatch` pattern

## Next Steps

### Additional Tests to Add

1. **Page Tests**
   - Dashboard page rendering
   - Customer list pagination
   - Funnel visualization

2. **Integration Tests**
   - Full user flows
   - Form submission workflows
   - Navigation flows

3. **Hook Tests**
   - Custom hooks
   - Context providers
   - State management

4. **Accessibility Tests**
   - Keyboard navigation
   - Screen reader support
   - ARIA compliance

## Resources

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
