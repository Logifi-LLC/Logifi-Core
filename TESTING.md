# Testing Guide

This guide explains how to run tests, the test structure, and how to write new tests for Logifi.

## Test Setup

Logifi uses two testing frameworks:
- **Vitest**: Unit and integration tests
- **Playwright**: End-to-end (E2E) tests

## Running Tests

### Unit and Integration Tests (Vitest)

```bash
# Run all tests once
npm run test

# Watch mode (re-runs on file changes)
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

**Note**: E2E tests require the development server to be running. Playwright will start it automatically, but you can also run `npm run dev` manually.

## Test Structure

```
logifi.web/
├── app/
│   ├── utils/__tests__/          # Unit tests for utilities
│   │   ├── currencyCalculator.test.ts
│   │   ├── validation.test.ts
│   │   ├── nightTimeCalculator.test.ts
│   │   └── form8710Calculator.test.ts
│   └── composables/__tests__/    # Integration tests for composables
│       ├── useCurrency.test.ts
│       ├── useValidation.test.ts
│       └── useExport.test.ts
├── tests/
│   ├── e2e/                      # E2E tests
│   │   ├── import.spec.ts
│   │   ├── export.spec.ts
│   │   ├── offline.spec.ts
│   │   └── compliance.spec.ts
│   └── setup.ts                  # Test setup file
├── vitest.config.ts              # Vitest configuration
└── playwright.config.ts          # Playwright configuration
```

## Writing Tests

### Unit Tests (Vitest)

Unit tests test individual functions in isolation.

**Example**:
```typescript
import { describe, it, expect } from 'vitest'
import { calculatePassengerCurrency } from '../currencyCalculator'

describe('calculatePassengerCurrency', () => {
  it('should return expired status when no entries provided', () => {
    const result = calculatePassengerCurrency([])
    expect(result.isCurrent).toBe(false)
    expect(result.status).toBe('expired')
  })
})
```

### Integration Tests (Vitest)

Integration tests test composables with mocked dependencies.

**Example**:
```typescript
import { describe, it, expect } from 'vitest'
import { useCurrency } from '../useCurrency'

describe('useCurrency', () => {
  it('should calculate currency for entries', () => {
    const { calculateAllCurrency, passengerCurrency } = useCurrency()
    calculateAllCurrency(entries)
    expect(passengerCurrency.value).not.toBeNull()
  })
})
```

### E2E Tests (Playwright)

E2E tests test the full application in a browser.

**Example**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Import Functionality', () => {
  test('should display import options', async ({ page }) => {
    await page.goto('/')
    const importButton = page.locator('button:has-text("Import")')
    await expect(importButton.first()).toBeVisible()
  })
})
```

## Test Configuration

### Vitest Configuration

Located in `vitest.config.ts`:
- Environment: happy-dom (browser-like environment)
- Setup file: `tests/setup.ts`
- Coverage provider: v8

### Playwright Configuration

Located in `playwright.config.ts`:
- Test directory: `tests/e2e`
- Base URL: `http://localhost:3000`
- Browser: Chromium (can be extended)
- Auto-starts dev server

## Mocking

### Mocking Supabase

Supabase is mocked in `tests/setup.ts`. For composable tests, you can create additional mocks:

```typescript
vi.mock('~/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))
```

### Mocking Composables

```typescript
vi.mock('../useAirportLookup', () => ({
  useAirportLookup: () => ({
    lookupAirport: vi.fn().mockResolvedValue(null)
  })
}))
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Test Names**: Use descriptive test names that explain what is being tested
3. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
4. **Mock External Dependencies**: Mock Supabase, APIs, and other external services
5. **Test Edge Cases**: Test error conditions, empty inputs, and boundary cases
6. **Keep Tests Fast**: Unit tests should run quickly; use mocks to avoid real API calls

## Coverage Goals

- **Utilities**: 80%+ coverage for critical calculation and validation functions
- **Composables**: Test reactive state management and error handling
- **E2E**: Cover critical user flows (import, export, offline, compliance)

## CI/CD Considerations

For CI/CD integration:

1. **Unit Tests**: Run on every commit
2. **E2E Tests**: Run on pull requests and main branch
3. **Coverage**: Generate coverage reports and track coverage trends
4. **Parallel Execution**: Use parallel test execution for faster runs

Example GitHub Actions workflow:
```yaml
- run: npm run test
- run: npm run test:coverage
- run: npm run test:e2e
```

## Troubleshooting

### Tests Failing

1. **Check test output**: Read error messages carefully
2. **Run tests individually**: Use `.only()` to isolate failing tests
3. **Check mocks**: Ensure mocks are set up correctly
4. **Update snapshots**: If using snapshot tests, update with `-u` flag

### E2E Tests Failing

1. **Check dev server**: Ensure dev server starts correctly
2. **Check selectors**: UI selectors may have changed
3. **Check timing**: Add waits for async operations
4. **Run in headed mode**: Use `npm run test:e2e:headed` to see what's happening

### Coverage Issues

1. **Check coverage report**: Review uncovered lines
2. **Add tests**: Write tests for uncovered code
3. **Exclude files**: Update coverage exclusions in `vitest.config.ts` if needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
