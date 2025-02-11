import { encodeBase64 } from '@/utility/utils';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { CLONE_PROJECT_LOCATOR, MONACO_LINES_LOCATOR } from 'tests/locators';
import {
  getActiveProject,
  getActiveProjectLocator,
  getElementContent,
  isCodeEditorLoaded,
  normalizeString,
} from 'tests/utils';

test('Clone code from shared link to local', async ({ page, browserName }) => {
  test.skip(
    ['firefox', 'webkit'].includes(browserName),
    'clipboard not working on theese browsers',
  );
  // Generate share code
  const shareCode = `contract ${randomUUID()} with Deployable {\n\n\n}`;
  const url = `https://ide.ton.org/?code=${encodeBase64(shareCode)}&lang=tact`;
  const projectName = randomUUID();

  // Open page with share code
  await page.goto(url);
  await isCodeEditorLoaded(page);
  const ideCodeBefore = await getElementContent(page, MONACO_LINES_LOCATOR);

  // Validate that project name is "temp" is active
  await expect(await getActiveProject(page)).toBe('temp');
  await expect(normalizeString(ideCodeBefore)).toBe(normalizeString(shareCode));
  await page.locator(CLONE_PROJECT_LOCATOR).click();

  await expect(
    page.getByRole('textbox', { name: 'Project name' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Project name' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(projectName);
  await page.getByRole('button', { name: 'Save' }).click();

  // Validate that project name is new
  await expect(await getActiveProjectLocator(page)).toHaveText(projectName);
  await page
    .locator('div')
    .filter({ hasText: /^main\.tact$/ })
    .nth(1)
    .click();
  await page.waitForTimeout(200);

  // Validate IDE code
  const ideCodeAfter = await getElementContent(page, MONACO_LINES_LOCATOR);

  await expect(normalizeString(ideCodeAfter)).toBe(normalizeString(shareCode));
});
