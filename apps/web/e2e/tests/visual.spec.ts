/**
 * Visual regression tests for critical pages
 * Run with: npx playwright test --grep "@visual"
 */
import { test, expect } from '@playwright/test';
import { navigateTo, waitForPageLoad, setDesktopViewport, setMobileViewport } from '../utils/helpers';
import { setupApiMocks, setupWalletMock } from '../mocks/api';

test.describe('@visual Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page);
  });

  test('homepage should match snapshot - desktop', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('homepage should match snapshot - mobile', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Wait for animations to complete
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('analytics page should match snapshot', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('analytics-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('bridge page should match snapshot', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('bridge-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('profile page should match snapshot', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('profile-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('navigation should be visible - desktop', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    const nav = page.locator('nav').first();
    await expect(nav).toHaveScreenshot('navigation-desktop.png');
  });

  test('navigation should be visible - mobile', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    const mobileNav = page.locator('[class*="bottom-nav"]').first();
    await expect(mobileNav).toHaveScreenshot('navigation-mobile.png');
  });
});
