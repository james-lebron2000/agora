/**
 * Test utilities and helpers for Agora E2E tests
 */

import { Page, Locator, expect } from '@playwright/test';

/**
 * Navigate to a specific route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await waitForPageLoad(page);
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForElement(
  locator: Locator,
  options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }
): Promise<void> {
  const { timeout = 10000, state = 'visible' } = options || {};
  await expect(locator).toHaveCount(1, { timeout });
  await expect(locator).toBeVisible({ timeout });
}

/**
 * Click element with retry logic
 */
export async function safeClick(locator: Locator, options?: { timeout?: number }): Promise<void> {
  const { timeout = 10000 } = options || {};
  await locator.waitFor({ state: 'visible', timeout });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout });
}

/**
 * Fill input with value and verify
 */
export async function fillInput(
  locator: Locator,
  value: string,
  options?: { clearFirst?: boolean; timeout?: number }
): Promise<void> {
  const { clearFirst = true, timeout = 10000 } = options || {};
  await locator.waitFor({ state: 'visible', timeout });
  
  if (clearFirst) {
    await locator.clear();
  }
  
  await locator.fill(value);
  await expect(locator).toHaveValue(value);
}

/**
 * Get text content from multiple elements
 */
export async function getAllTextContents(locator: Locator): Promise<string[]> {
  return locator.allTextContents();
}

/**
 * Check if element contains specific text
 */
export async function containsText(
  locator: Locator,
  text: string,
  options?: { timeout?: number }
): Promise<boolean> {
  try {
    const { timeout = 5000 } = options || {};
    await expect(locator).toContainText(text, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll to bottom of page
 */
export async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
}

/**
 * Scroll to top of page
 */
export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  const { fullPage = true } = options || {};
  await page.screenshot({
    path: `./e2e/screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Check if page has specific element
 */
export async function hasElement(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<boolean> {
  try {
    const { timeout = 5000 } = options || {};
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Perform login flow (if applicable)
 */
export async function performLogin(
  page: Page,
  credentials?: { address?: string; signature?: string }
): Promise<void> {
  // For web3 apps, login is typically done via wallet connection
  // This is a placeholder for any specific login flow
  const connectButton = page.locator('[data-testid="connect-wallet"], button:has-text("Connect")').first();
  
  if (await connectButton.isVisible().catch(() => false)) {
    await connectButton.click();
    // Wait for wallet modal or connection
    await page.waitForTimeout(2000);
  }
}

/**
 * Verify page accessibility
 */
export async function verifyAccessibility(page: Page): Promise<void> {
  // Check for basic accessibility markers
  const hasLang = await page.evaluate(() => document.documentElement.lang !== '');
  expect(hasLang).toBe(true);

  // Check for proper heading hierarchy
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBeGreaterThanOrEqual(1);
}

/**
 * Measure page performance metrics
 */
export async function measurePerformance(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstPaint?: number;
}> {
  const metrics = await page.evaluate(() => {
    const perf = performance;
    const nav = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      loadTime: nav ? nav.loadEventEnd - nav.startTime : 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd - nav.startTime : 0,
      firstPaint: perf.getEntriesByName('first-paint')[0]?.startTime,
    };
  });
  
  return metrics;
}

/**
 * Wait for animation to complete
 */
export async function waitForAnimation(locator: Locator, timeout = 1000): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  await new Promise((resolve) => setTimeout(resolve, timeout));
}

/**
 * Mock mobile viewport
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 812 });
}

/**
 * Mock tablet viewport
 */
export async function setTabletViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 768, height: 1024 });
}

/**
 * Mock desktop viewport
 */
export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1920, height: 1080 });
}

/**
 * Helper to check responsive behavior
 */
export async function testResponsive(
  page: Page,
  testFn: () => Promise<void>
): Promise<void> {
  // Desktop
  await setDesktopViewport(page);
  await testFn();

  // Tablet
  await setTabletViewport(page);
  await testFn();

  // Mobile
  await setMobileViewport(page);
  await testFn();
}

/**
 * Retry operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options?: { maxRetries?: number; delay?: number }
): Promise<T> {
  const { maxRetries = 3, delay = 1000 } = options || {};
  
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError!;
}
