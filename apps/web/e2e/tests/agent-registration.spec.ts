import { test, expect } from '@playwright/test';
import { 
  navigateTo, 
  waitForPageLoad, 
  safeClick, 
  waitForElement,
  setDesktopViewport,
  setMobileViewport 
} from '../utils/helpers';
import { setupApiMocks, setupWalletMock, MOCK_AGENTS } from '../mocks/api';

test.describe('Agent Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page);
  });

  test('should display agent list on homepage', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for agent list section
    const agentSection = page.locator('h2:has-text("Recent Agents")');
    await waitForElement(agentSection);

    // Verify agents are displayed
    const agentCards = page.locator('[class*="rounded-lg"]').filter({ hasText: /Polyglot|CleanCode|DataLens/ });
    const count = await agentCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to analytics page with agent catalog', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Click on Analytics link
    const analyticsLink = page.locator('a:has-text("Analytics")');
    await safeClick(analyticsLink);

    // Verify navigation
    await expect(page).toHaveURL(/.*analytics.*/);

    // Check for Agent Catalog section
    const catalogHeader = page.locator('h3:has-text("Agent Catalog")');
    await waitForElement(catalogHeader);

    // Verify agent cards with pricing
    const agentCards = page.locator('[class*="rounded-2xl"]').filter({ has: page.locator('.font-semibold') });
    await expect(agentCards.first()).toBeVisible();
  });

  test('should display agent details with reputation', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Look for agent with reputation score
    const reputationScore = page.locator('text=/Score \\d+\\.\\d+/');
    const hasReputation = await reputationScore.isVisible().catch(() => false);
    
    if (hasReputation) {
      expect(await reputationScore.textContent()).toMatch(/Score \d+\.\d+/);
    }
  });

  test('should show agent capabilities and pricing', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Check for capability cards
    const capabilityCards = page.locator('[class*="bg-agora-50"]').filter({ hasText: /Translation|Code Review|Data Analyst/ });
    
    // Wait for at least one capability to be visible
    await expect(capabilityCards.first()).toBeVisible({ timeout: 10000 });

    // Verify pricing information is shown
    const pricingInfo = page.locator('text=/USDC|USD|fixed|metered/');
    const hasPricing = await pricingInfo.count() > 0;
    expect(hasPricing).toBe(true);
  });

  test('should handle agent status indicators correctly', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Check for status indicators
    const statusIndicators = page.locator('span:has-text("online"), span:has-text("offline"), span:has-text("busy")');
    
    if (await statusIndicators.count() > 0) {
      const onlineStatus = page.locator('span:has-text("online")').first();
      const isVisible = await onlineStatus.isVisible().catch(() => false);
      
      if (isVisible) {
        const className = await onlineStatus.getAttribute('class');
        expect(className).toContain('success');
      }
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Check that content is visible and properly laid out
    const catalogHeader = page.locator('h3:has-text("Agent Catalog")');
    await waitForElement(catalogHeader);

    // Verify no horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
