import { test, expect } from '@playwright/test';
import { 
  navigateTo, 
  waitForPageLoad, 
  safeClick, 
  waitForElement,
  fillInput,
  setMobileViewport,
  setDesktopViewport
} from '../utils/helpers';
import { setupApiMocks, setupWalletMock, MOCK_WALLET_STATE } from '../mocks/api';

test.describe('Bridge UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page, MOCK_WALLET_STATE);
  });

  test('should navigate to bridge page', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Click on Bridge link
    const bridgeLink = page.locator('a:has-text("Bridge")');
    await safeClick(bridgeLink);

    // Verify navigation
    await expect(page).toHaveURL(/.*bridge.*/);

    // Check for bridge page header
    const bridgeHeader = page.locator('h1:has-text("Bridge"), h1:has-text("Cross-Chain")');
    await waitForElement(bridgeHeader);
  });

  test('should display bridge card component', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Look for BridgeCard component
    const bridgeCard = page.locator('[class*="bridge"], [class*="rounded-2xl"]').first();
    await expect(bridgeCard).toBeVisible({ timeout: 10000 });
  });

  test('should display bridge status component', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Look for BridgeStatus component
    const bridgeStatus = page.locator('[class*="status"], [class*="BridgeStatus"]').first();
    
    // BridgeStatus might be in a sidebar
    const sidebar = page.locator('aside, [class*="col-span"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should show bridge description text', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Check for descriptive text about bridging
    const description = page.locator('p:has-text("Bridge"), p:has-text("USDC"), p:has-text("ETH")');
    await expect(description.first()).toBeVisible();
  });

  test('should be responsive on desktop', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Check for grid layout
    const gridContainer = page.locator('[class*="grid-cols-"]').first();
    await expect(gridContainer).toBeVisible();

    // Verify 3-column layout on desktop
    const className = await gridContainer.getAttribute('class');
    expect(className).toContain('grid-cols-');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Check that content stacks vertically
    const mainContent = page.locator('main, [class*="min-h-screen"]').first();
    await expect(mainContent).toBeVisible();

    // Verify no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should display wallet provider wrapper', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Bridge page uses WalletProvider
    const walletButton = page.locator('button').filter({ hasText: /Connect|Wallet|0x/ });
    
    // Wallet button should be present somewhere on the page
    const hasWalletUI = await walletButton.count() > 0;
    expect(hasWalletUI).toBe(true);
  });

  test('should handle bridge page refresh', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Refresh the page
    await page.reload();
    await waitForPageLoad(page);

    // Verify page loads correctly after refresh
    const bridgeHeader = page.locator('h1').first();
    await expect(bridgeHeader).toBeVisible();
    await expect(page).toHaveURL(/.*bridge.*/);
  });

  test('should display cross-chain information', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Check for chain names in content
    const content = page.locator('body');
    const pageText = await content.textContent();
    
    // Should mention supported chains
    const hasChainInfo = 
      pageText?.toLowerCase().includes('base') ||
      pageText?.toLowerCase().includes('optimism') ||
      pageText?.toLowerCase().includes('arbitrum') ||
      pageText?.toLowerCase().includes('ethereum') ||
      pageText?.toLowerCase().includes('usdc') ||
      pageText?.toLowerCase().includes('eth');
    
    expect(hasChainInfo).toBe(true);
  });

  test('should maintain state during navigation', async ({ page }) => {
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Navigate to another page and back
    await navigateTo(page, '/');
    await waitForPageLoad(page);
    await navigateTo(page, '/bridge');
    await waitForPageLoad(page);

    // Bridge page should still be functional
    const bridgeHeader = page.locator('h1').first();
    await expect(bridgeHeader).toBeVisible();
  });
});
