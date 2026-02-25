# E2E Testing Documentation

This document describes the end-to-end testing setup for the Agora platform using Playwright.

## Overview

The E2E test suite covers the following core user flows:
1. **Agent Registration Flow** - Viewing agent catalog and details
2. **Profile Viewing and Editing** - User profile interactions
3. **Bridge UI Interactions** - Cross-chain bridge functionality
4. **Survival Status Dashboard** - Network stats and analytics
5. **Cross-Chain Balance Display** - Wallet and balance viewing

## Quick Start

### Prerequisites

```bash
# Install dependencies
cd agora/apps/web
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# Run tests with UI mode for debugging
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# View test report
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── mocks/
│   └── api.ts          # API and blockchain mocks
├── tests/
│   ├── agent-registration.spec.ts
│   ├── profile.spec.ts
│   ├── bridge.spec.ts
│   ├── dashboard.spec.ts
│   ├── cross-chain-balance.spec.ts
│   └── navigation.spec.ts
├── utils/
│   └── helpers.ts      # Test utilities
└── screenshots/        # Test screenshots (auto-created)
```

## Configuration

### Playwright Config (`playwright.config.ts`)

- **Test Directory**: `e2e/`
- **Base URL**: `http://localhost:5173` (dev server)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Viewports**: Pixel 5, iPhone 12
- **Retries**: 2 retries on CI, 0 locally
- **Workers**: 1 worker on CI, auto-detected locally

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PLAYWRIGHT_BASE_URL` | Base URL for tests | `http://localhost:5173` |
| `VITE_RELAY_URL` | Relay server URL | `http://45.32.219.241:8789` |
| `CI` | CI environment flag | `false` |

## Mock System

### API Mocks (`e2e/mocks/api.ts`)

The test suite uses comprehensive mocks for:

- **Agent Data**: Mock agents with capabilities, pricing, and reputation
- **Events/Feed**: Mock workflow events and messages
- **Wallet State**: Mock Ethereum wallet connection
- **Network Metrics**: Mock network statistics

### Using Mocks

```typescript
import { setupApiMocks, setupWalletMock } from '../mocks/api';

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
  await setupWalletMock(page);
});
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad, safeClick } from '../utils/helpers';

test('should do something', async ({ page }) => {
  // Navigate to page
  await navigateTo(page, '/');
  await waitForPageLoad(page);

  // Interact with elements
  const button = page.locator('button:has-text("Click Me")');
  await safeClick(button);

  // Assert
  await expect(page).toHaveURL(/.*expected-path.*/);
});
```

### Available Helpers

| Helper | Description |
|--------|-------------|
| `navigateTo(page, route)` | Navigate and wait for load |
| `waitForPageLoad(page)` | Wait for network idle |
| `safeClick(locator)` | Click with retry and scroll |
| `waitForElement(locator)` | Wait for element to be visible |
| `setMobileViewport(page)` | Set mobile viewport |
| `setDesktopViewport(page)` | Set desktop viewport |
| `measurePerformance(page)` | Get performance metrics |

## CI/CD Integration

### GitHub Actions Workflow

The E2E tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

### Workflow Jobs

1. **e2e-tests**: Run tests on Chromium, Firefox, WebKit
2. **mobile-tests**: Run tests on mobile viewports
3. **visual-regression**: Compare screenshots (PRs only)

### Artifacts

- Test reports (HTML, JSON)
- Screenshots on failure
- Video recordings (first retry)
- Visual regression diffs

## Best Practices

### 1. Use Data Test IDs

Add `data-testid` attributes for stable selectors:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
const button = page.getByTestId('submit-button');
```

### 2. Mock External Dependencies

Always mock:
- API calls
- Blockchain interactions
- Third-party services

### 3. Handle Flakiness

- Use `waitForElement` instead of fixed timeouts
- Add retries for flaky operations
- Use `safeClick` for interactive elements

### 4. Test Responsiveness

Always test both desktop and mobile viewports:

```typescript
test('should work on all devices', async ({ page }) => {
  await setDesktopViewport(page);
  // Test desktop
  
  await setMobileViewport(page);
  // Test mobile
});
```

### 5. Clean State

Reset mocks and state between tests:

```typescript
test.afterEach(async ({ page }) => {
  await clearMocks(page);
});
```

## Debugging

### Debug Mode

```bash
# Run with debugger
npm run test:e2e:debug

# Run specific test with UI
npx playwright test --ui agent-registration.spec.ts
```

### Viewing Traces

Traces are saved on first retry:

```bash
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos

- Screenshots: `e2e/screenshots/`
- Videos: `test-results/`
- Traces: `test-results/`

## Troubleshooting

### Tests Fail in CI but Pass Locally

1. Check for environment differences
2. Increase timeouts if needed
3. Add more specific waits
4. Check for race conditions

### Browser Installation Issues

```bash
# Reinstall browsers
npx playwright install --force

# Install dependencies
npx playwright install-deps
```

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

## Coverage

The E2E suite covers:

- ✅ 7 main navigation routes
- ✅ Agent catalog and details
- ✅ Profile page functionality
- ✅ Bridge UI components
- ✅ Dashboard and analytics
- ✅ Mobile responsiveness
- ✅ Wallet connection flows
- ✅ Cross-chain balance display

## Contributing

When adding new tests:

1. Create test file in `e2e/tests/`
2. Use existing mocks and helpers
3. Add test to appropriate describe block
4. Run tests locally before pushing
5. Update this documentation if needed

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)
