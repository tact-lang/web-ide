import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { MONACO_LINES_LOCATOR } from 'tests/locators';
import {
  checkContextButtonsForFileIsVisible,
  createProject,
  isCodeEditorLoaded,
  ProjectType,
} from 'tests/utils';

test('Check file is deleting', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.BlankContract);

  await isCodeEditorLoaded(page);

  // Click in Code Editor, make focus
  await page.locator(MONACO_LINES_LOCATOR).click();

  await checkContextButtonsForFileIsVisible(page, 'main.tact');

  // Click delete
  await page
    .getByRole('listitem')
    .filter({ hasText: 'main.tact' })
    .getByRole('img')
    .nth(2)
    .click();

  // Check buttons is not in DOM
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'main.tact' })
      .locator('div')
      .first(),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'main.tact' })
      .locator('span')
      .nth(1),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'main.tact' })
      .locator('span')
      .nth(2),
  ).not.toBeVisible();
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: 'main.tact' })
      .locator('span')
      .nth(3),
  ).not.toBeVisible();
});
