import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  createProject,
  isCodeEditorLoaded,
  logsContain,
  openBuildAndDeployTab,
  openUnitTests,
  ProjectType,
} from 'tests/utils';

test('Create Counter contract and run Unit test', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  const projectName = randomUUID();
  // Create project
  await createProject(page, projectName, ProjectType.CounterContract);

  await isCodeEditorLoaded(page);
  await openBuildAndDeployTab(page);

  await logsContain(page, [`Project '${projectName}' is opened`]);

  // Build contract
  await expect(page.getByRole('button', { name: 'Build' })).toBeVisible();
  await page.getByRole('button', { name: 'Build' }).click();
  await page.waitForTimeout(2000);
  // Check build logs
  await logsContain(page, [/Built Successfully/]);

  await openUnitTests(page);
  await page.waitForTimeout(1500); // TODO: Remove this timeout after fix #249
  await expect(page.getByText('Select .spec.ts file to run')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();

  await page.waitForTimeout(1500);
  await logsContain(page, [
    `Test Suites: 1 passed, 1 total`,
    `Tests:       2 passed, 2 total`,
    `Snapshots:   0 total`,
    `Ran all test suites matching /Counter.spec.js/i`,
  ]);
});
