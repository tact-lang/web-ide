import { expect, test } from '@playwright/test';
import { SWITCH_THEME_LOCATOR } from 'tests/locators';

test('Theme should switch', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');

  // Validate light theme
  await expect(page).toHaveScreenshot('light.png', { maxDiffPixels: 100 });
  await expect(page.locator(SWITCH_THEME_LOCATOR)).toBeVisible();

  // Toggle theme
  await page.locator(SWITCH_THEME_LOCATOR).click();
  // Validate dark theme
  await expect(page).toHaveScreenshot('dark.png', { maxDiffPixels: 100 });
});
