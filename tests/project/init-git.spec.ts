import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  createProject,
  openCodeTab,
  openGitTab,
  ProjectType,
} from 'tests/utils';

test('Init git in new project', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.BlankContract);

  // Open git tab
  await openGitTab(page);

  await expect(page.getByText('Git Version Control')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Initialize Git' }),
  ).toBeVisible();

  // Press "Initialize Git" button
  await page.getByRole('button', { name: 'Initialize Git' }).click();

  // Check Changes pane is visible
  await expect(
    page.getByRole('button', { name: 'caret-right Changes' }),
  ).toBeVisible();
  // Check Remote pane is visible
  await expect(
    page.getByRole('button', { name: 'caret-right Remote' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'GitHub repository URL' }),
  ).toBeVisible();
  await expect(
    page
      .locator('div')
      .filter({ hasText: /^Remote Save$/ })
      .locator('button'),
  ).toBeVisible();
  // Check Sync pane is visible
  await expect(page.getByRole('button', { name: 'Pull' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'caret-right Sync' }),
  ).toBeVisible();
  await expect(page.getByText('Force Push')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Push' })).toBeVisible();
  // Check Setting pane is visible
  await expect(
    page.getByRole('button', { name: 'caret-right Setting' }),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Username, e.g., John Doe' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: 'Git Personal Access Token' }),
  ).toBeVisible();
  await expect(page.getByText('Guide to create a personal')).toBeVisible();
  await expect(
    page
      .locator('form')
      .filter({ hasText: 'Guide to create a personal' })
      .getByRole('button'),
  ).toBeVisible();
  await page.waitForTimeout(2000);

  // Open Code tab
  await openCodeTab(page);
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: /^\.git$/ })
      .locator('div')
      .first(),
  ).toBeVisible();

  await page
    .getByRole('listitem')
    .filter({ hasText: /^\.git$/ })
    .locator('div')
    .first()
    .hover();

  await page
    .getByRole('listitem')
    .filter({ hasText: /^\.git$/ })
    .locator('span')
    .nth(4)
    .click();

  // Check .git folder is removed
  await expect(
    page
      .locator('listitem')
      .filter({ hasText: /^\.git$/ })
      .first(),
  ).not.toBeVisible();

  // Check Git tab is empty
  await openGitTab(page);

  await expect(page.getByText('Git Version Control')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Initialize Git' }),
  ).toBeVisible();
});
