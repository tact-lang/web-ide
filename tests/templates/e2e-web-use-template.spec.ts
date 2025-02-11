import { expect, test } from '@playwright/test';
import { MONACO_LINES_LOCATOR } from '../locators';
import {
  getElementContent,
  isCodeEditorLoaded,
  normalizeString,
} from '../utils';

test('Web IDE use template', async ({ page }) => {
  const TEMPLATE_NAME = 'The Deployable Trait';

  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  await expect(
    page.getByRole('heading', { name: 'Tact Templates:' }),
  ).toBeVisible();
  // Select template
  await expect(page.getByText(TEMPLATE_NAME)).toBeVisible();
  await page.getByText(TEMPLATE_NAME).click();

  const templatePre = page.locator('pre').locator('div').first();
  await expect(templatePre).toBeVisible();

  // Load and Use template
  const templateContentValue = await templatePre.textContent();
  await expect(page.getByRole('button', { name: 'Use in IDE' })).toBeVisible();
  await page.getByRole('button', { name: 'Use in IDE' }).click();

  await isCodeEditorLoaded(page);

  const codeBlockText = await getElementContent(page, MONACO_LINES_LOCATOR);

  // Compare code from Web IDE and template
  await expect(normalizeString(codeBlockText)).toEqual(
    normalizeString(templateContentValue || ''),
  );
});
