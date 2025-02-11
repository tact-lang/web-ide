import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { CLONE_PROJECT_LOCATOR, MONACO_LINES_LOCATOR } from 'tests/locators';
import {
  checkContextButtonsForFileIsVisible,
  createProject,
  getActiveProject,
  getElementContent,
  isCodeEditorLoaded,
  ProjectType,
} from 'tests/utils';

test('Check file is sharing', async ({ page, browserName }) => {
  test.skip(
    ['firefox', 'webkit'].includes(browserName),
    'clipboard not working on theese browsers',
  );
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.BlankContract);
  await isCodeEditorLoaded(page);

  // Check file is visible in context menu, check context buttons
  await checkContextButtonsForFileIsVisible(page, 'main.tact');

  // Click in Code Editor, make focus
  await page.locator(MONACO_LINES_LOCATOR).click();

  // Edit, make file some random
  const text = randomUUID();
  // Select all
  await page.keyboard.press('Control+a');
  // Replace all with random text
  await page.keyboard.type(text);
  // Save file
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(1000);

  // Click share
  await page.getByRole('listitem').filter({ hasText: 'main.tact' }).hover();
  await page
    .getByRole('listitem')
    .filter({ hasText: 'main.tact' })
    .getByRole('img')
    .nth(1)
    .click();

  // Open link from clipboard
  const clipboardContent = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  await expect(clipboardContent).toMatch(
    /https:\/\/[A-Za-z\-]{0,14}.ton.org\/\?code=.*/,
  );

  // Open link in new tab
  await page.goto(clipboardContent);
  await isCodeEditorLoaded(page);
  const codeBlockText = await getElementContent(page, MONACO_LINES_LOCATOR);

  await expect(codeBlockText).toBe(text);
  await expect(page.locator(CLONE_PROJECT_LOCATOR)).toBeVisible();

  // Validate that project name is "temp" is active
  await expect(await getActiveProject(page)).toBe('temp');
});
