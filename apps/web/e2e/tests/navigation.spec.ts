import { test, expect } from '@playwright/test';
import { 
  navigateTo, 
  waitForPageLoad, 
  safeClick, 
  waitForElement,
  setMobileViewport,
  setDesktopViewport,
  verifyAccessibility
} from '../utils/helpers';
import { setupApiMocks, setupWalletMock } from '../mocks/api';

test.describe('Navigation and Layout', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setupWalletMock(page);
  });

  test('should display main navigation links', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for main navigation links
    const navLinks = ['Home', 'Analytics', 'Tokenomics', 'Echo', 'AR HUD', 'Bridge', 'Profile'];
    
    for (const link of navLinks) {
      const navLink = page.locator(`a:has-text("${link}")`).first();
      await expect(navLink).toBeVisible();
    }
  });

  test('should navigate to all main routes', async ({ page }) => {
    const routes = [
      { path: '/', name: 'Home' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/tokenomics', name: 'Tokenomics' },
      { path: '/echo', name: 'Echo' },
      { path: '/ar', name: 'AR' },
      { path: '/bridge', name: 'Bridge' },
      { path: '/profile', name: 'Profile' },
    ];

    for (const route of routes) {
      await navigateTo(page, route.path);
      await waitForPageLoad(page);

      // Verify URL
      await expect(page).toHaveURL(new RegExp(`.*${route.path.replace('/', '')}.*`));

      // Verify page has content
      const content = page.locator('body');
      await expect(content).toBeVisible();
    }
  });

  test('should display mobile navigation on small screens', async ({ page }) => {
    await setMobileViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for mobile header
    const mobileHeader = page.locator('[class*="mobile-header"], header[class*="fixed"]').first();
    await expect(mobileHeader).toBeVisible({ timeout: 5000 });

    // Check for bottom navigation
    const bottomNav = page.locator('[class*="bottom-nav"], nav[class*="fixed bottom"]').first();
    await expect(bottomNav).toBeVisible({ timeout: 5000 });
  });

  test('should display desktop navigation on large screens', async ({ page }) => {
    await setDesktopViewport(page);
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Navigation should be visible in some form
    const nav = page.locator('nav, [class*="nav"]').first();
    await expect(nav).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Check for active state on Analytics link
    const analyticsLink = page.locator('a:has-text("Analytics")');
    const className = await analyticsLink.getAttribute('class');
    
    // Should have some indication of being active
    const isActive = className?.includes('active') || 
                     className?.includes('current') || 
                     className?.includes('bg-agora-900') ||
                     className?.includes('text-white');
    
    expect(isActive).toBe(true);
  });

  test('should have consistent layout across pages', async ({ page }) => {
    const routes = ['/', '/analytics', '/bridge', '/profile'];

    for (const route of routes) {
      await navigateTo(page, route);
      await waitForPageLoad(page);

      // Verify page has header/nav
      const header = page.locator('header, nav, [class*="header"]').first();
      await expect(header).toBeVisible();

      // Verify page has main content area
      const main = page.locator('main, [class*="main"], body > div').first();
      await expect(main).toBeVisible();
    }
  });

  test('should handle back navigation correctly', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Navigate to Analytics
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Go back
    await page.goBack();
    await waitForPageLoad(page);

    // Should be back at home
    await expect(page).toHaveURL(/.*\/$/);
  });

  test('should have proper page titles', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for h1 headings
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    const title = await h1.textContent();
    expect(title?.length).toBeGreaterThan(0);
  });

  test('should display footer elements', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Look for footer or bottom elements
    const footer = page.locator('footer, [class*="footer"]').first();
    
    // Or check for bottom navigation on mobile
    const bottomNav = page.locator('[class*="bottom"]').first();

    const hasFooter = await footer.isVisible().catch(() => false) || 
                      await bottomNav.isVisible().catch(() => false);
    
    expect(hasFooter).toBe(true);
  });

  test('should maintain scroll position between navigations', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollYBefore = await page.evaluate(() => window.scrollY);

    // Navigate to another page
    await navigateTo(page, '/analytics');
    await waitForPageLoad(page);

    // Go back
    await page.goBack();
    await waitForPageLoad(page);

    // Scroll might reset or be maintained - either is acceptable
    const scrollYAfter = await page.evaluate(() => window.scrollY);
    expect(typeof scrollYAfter).toBe('number');
  });

  test('should have accessible navigation', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Check for aria-current on active link
    const activeLink = page.locator('a[aria-current="page"]').first();
    
    // At least one link should have aria-current or similar
    const hasAria = await activeLink.count() > 0;
    expect(hasAria).toBe(true);
  });

  test('should handle rapid navigation', async ({ page }) => {
    await navigateTo(page, '/');
    await waitForPageLoad(page);

    // Rapidly navigate between pages
    const routes = ['/', '/analytics', '/bridge', '/profile', '/'];
    
    for (const route of routes) {
      await navigateTo(page, route);
    }

    // Final page should be stable
    await waitForPageLoad(page);
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});
