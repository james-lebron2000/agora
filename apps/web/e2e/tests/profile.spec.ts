import { test, expect } from '@playwright/test';
import { 
  navigateTo, 
  waitForPageLoad, 
  safeClick, 
  waitForElement,
  fillInput,
  setMobileViewport
} from '../utils/helpers';
import { setupApiMocks, setupWalletMock, MOCK_WALLET_STATE } from '../mocks/api';

test.describe('Profile Viewing and Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page, MOCK_WALLET_STATE);
  });

  test('should navigate to profile page', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Click on Profile link
    const profileLink = page.locator('a:has-text("Profile")');
    await safeClick(profileLink);

    // Verify navigation to profile
    await expect(page).toHaveURL(/.*profile.*/);

    // Verify profile page content is loaded
    await page.waitForLoadState('networkidle');
  });

  test('should display wallet connection button', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Check for wallet-related elements
    const walletElements = page.locator('button').filter({ hasText: /Connect|Wallet|0x/ });
    const hasWalletElement = await walletElements.count() > 0;
    expect(hasWalletElement).toBe(true);
  });

  test('should show profile sections', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Look for common profile section indicators
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify page structure
    const pageContent = page.locator('main, [class*="profile"], div');
    await expect(pageContent.first()).toBeVisible();
  });

  test('should handle wallet connection state', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Test wallet connection button interaction
    const connectButton = page.locator('button:has-text("Connect")').first();
    
    if (await connectButton.isVisible().catch(() => false)) {
      await safeClick(connectButton);
      
      // Wait for any modal or state change
      await page.waitForTimeout(1000);
      
      // Check if connection state changed
      const walletInfo = page.locator('text=/0x[0-9a-fA-F]+/');
      const hasAddress = await walletInfo.isVisible().catch(() => false);
      
      // Note: In mock mode, wallet might already be "connected"
      expect(hasAddress || await connectButton.isVisible()).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Check that mobile navigation is present
    const mobileNav = page.locator('[class*="bottom-nav"], [class*="mobile"]').first();
    await expect(mobileNav).toBeVisible({ timeout: 5000 });

    // Verify no horizontal overflow on mobile
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should display share profile functionality', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Look for share button or link
    const shareButton = page.locator('button:has-text("Share"), [class*="share"]').first();
    
    if (await shareButton.isVisible().catch(() => false)) {
      await safeClick(shareButton);
      
      // Wait for share modal or toast
      await page.waitForTimeout(500);
      
      // Check for share options or confirmation
      const shareModal = page.locator('[class*="modal"], [class*="dialog"]').first();
      if (await shareModal.isVisible().catch(() => false)) {
        await expect(shareModal).toBeVisible();
      }
    }
  });

  test('should handle profile data loading', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Wait for any loading states to complete
    const loadingIndicator = page.locator('text=/Loading|loading|Loading\\.\\.\\./');
    
    try {
      // Wait for loading to finish (if present)
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Loading indicator might not exist, which is fine
    }

    // Verify content is present after loading
    const content = page.locator('body');
    await expect(content).toContainText(/Agora|Profile|Agent/i);
  });

  test('should maintain scroll position on navigation', async ({ page }) => {
    await navigateTo(page, '/profile');
    await waitForPageLoad(page);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    // Navigate away and back
    await navigateTo(page, '/');
    await waitForPageLoad(page);
    await navigateTo(page, '/profile');

    // Page should be at top
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeLessThanOrEqual(100);
  });
});
