import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { MONACO_LINES_LOCATOR } from 'tests/locators';
import {
  createProject,
  getElementContent,
  isCodeEditorLoaded,
  ProjectType,
} from 'tests/utils';

test('Check file is saving by keyboard', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.BlankContract);

  await isCodeEditorLoaded(page);

  // Click in Code Editor, make focus
  await page.locator(MONACO_LINES_LOCATOR).click();

  // Start Typing
  const text = randomUUID();
  // Select all
  await page.keyboard.press('Control+a');
  // Replace all with random text
  await page.keyboard.type(text);
  // Save file
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(1000);
  // Check if file is saved, reloading page
  await page.reload();
  await isCodeEditorLoaded(page);

  const codeBlockText = await getElementContent(page, MONACO_LINES_LOCATOR);

  await expect(codeBlockText).toBe(text);
});
