import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { DELETE_PROJECT_LOCATOR } from 'tests/locators';
import { createProject, ProjectType } from 'tests/utils';

test('Create Blank Contract in Web IDE then delete', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.BlankContract);

  // Delete project
  await expect(page.locator(DELETE_PROJECT_LOCATOR)).toBeVisible();
  await page.locator(DELETE_PROJECT_LOCATOR).first().click();

  await expect(
    page.getByText(`Delete my \`${projectName}\` Project?`),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  // Check that project is deleted
  await expect(
    page.getByRole('button', { name: 'Create a new project' }),
  ).toBeVisible();
});
