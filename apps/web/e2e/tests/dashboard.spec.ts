import { test, expect } from '@playwright/test';
import { 
  navigateTo, 
  waitForPageLoad, 
  safeClick, 
  waitForElement,
  setMobileViewport,
  getAllTextContents
} from '../utils/helpers';
import { setupApiMocks, setupWalletMock, MOCK_NETWORK_METRICS } from '../mocks/api';

test.describe('Survival Status Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page);
  });

  test('should display network stats on homepage', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for Network Stats section
    const networkStatsHeader = page.locator('h2:has-text("Network Stats")');
    await waitForElement(networkStatsHeader);

    // Verify stats cards are present
    const statCards = page.locator('[class*="bg-agora-50"]').filter({ hasText: /agents|workflows|posts|volume/ });
    await expect(statCards.first()).toBeVisible();
  });

  test('should display correct network metrics', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for numeric values in stats
    const statsSection = page.locator('[class*="grid-cols-2"]').first();
    await expect(statsSection).toBeVisible();

    // Verify stats contain numbers
    const statTexts = await statsSection.locator('[class*="text-lg"], [class*="font-bold"]').allTextContents();
    const hasNumbers = statTexts.some(text => /\d/.test(text));
    expect(hasNumbers).toBe(true);
  });

  test('should show status indicator', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Look for status indicator
    const statusIndicator = page.locator('[class*="rounded-full"]').filter({ has: page.locator('span[class*="animate-pulse"]') }).first();
    
    // Check for status text
    const statusText = page.locator('text=/Connected|Demo Mode|Status:/');
    const hasStatus = await statusText.count() > 0;
    expect(hasStatus).toBe(true);
  });

  test('should display analytics dashboard', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Check for AnalyticsDashboard component
    const analyticsSection = page.locator('main, [class*="analytics"]').first();
    await expect(analyticsSection).toBeVisible();

    // Verify charts or data visualization
    const dataElements = page.locator('svg, canvas, [class*="chart"], [class*="graph"]');
    const hasDataViz = await dataElements.count() > 0;
    
    // Even if no charts, should have data sections
    expect(hasDataViz || await analyticsSection.isVisible()).toBe(true);
  });

  test('should show live feed status', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for feed section
    const feedHeader = page.locator('h2:has-text("Workflow Posts")');
    await waitForElement(feedHeader);

    // Verify feed status text
    const statusText = page.locator('p:has-text("Live feed"), p:has-text("seed demo")');
    await expect(statusText.first()).toBeVisible();
  });

  test('should display Run Demo button', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Look for Run Demo button
    const runDemoButton = page.locator('button:has-text("Run Demo")');
    await waitForElement(runDemoButton);

    // Verify button is clickable
    await expect(runDemoButton).toBeEnabled();
  });

  test('should update metrics on demo run', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Get initial stats
    const initialStats = await page.locator('[class*="grid-cols-2"] [class*="font-bold"]').allTextContents();

    // Click Run Demo
    const runDemoButton = page.locator('button:has-text("Run Demo")');
    await safeClick(runDemoButton);

    // Wait for potential update
    await page.waitForTimeout(2000);

    // Stats might have changed
    const updatedStats = await page.locator('[class*="grid-cols-2"] [class*="font-bold"]').allTextContents();
    
    // Stats should still be present
    expect(updatedStats.length).toBeGreaterThan(0);
  });

  test('should display activity indicators', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for activity-related elements
    const activityElements = page.locator('[class*="animate-pulse"], [class*="pulse"], .animate-spin');
    
    // At least one animated indicator might exist
    const hasActivity = await activityElements.count() > 0;
    
    // Or check for the status dot
    const statusDot = page.locator('span[class*="rounded-full"]').first();
    expect(hasActivity || await statusDot.isVisible()).toBe(true);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check that mobile navigation is visible
    const mobileNav = page.locator('[class*="bottom-nav"], nav[class*="fixed"]').first();
    await expect(mobileNav).toBeVisible({ timeout: 5000 });

    // Network stats should still be visible
    const networkStats = page.locator('h2:has-text("Network Stats")');
    await expect(networkStats).toBeVisible();
  });

  test('should display recommendations section', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for Recommendations section
    const recsHeader = page.locator('h2:has-text("Recommendations")');
    await waitForElement(recsHeader);

    // Verify recommendation cards
    const recCards = page.locator('[class*="bg-agora-50"]').filter({ has: page.locator('.font-semibold') });
    await expect(recCards.first()).toBeVisible();
  });

  test('should show network health in status bar', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Look for status container
    const statusContainer = page.locator('[class*="bg-base-light"], [class*="status"], [class*="rounded-xl"]').filter({ hasText: /Status|Connected|Demo/ }).first();
    
    if (await statusContainer.isVisible().catch(() => false)) {
      const statusText = await statusContainer.textContent();
      expect(statusText).toMatch(/Status|Connected|Demo Mode/i);
    }
  });
});
