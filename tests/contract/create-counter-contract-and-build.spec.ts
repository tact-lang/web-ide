import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  createProject,
  isCodeEditorLoaded,
  logsContain,
  openBuildAndDeployTab,
  ProjectType,
} from 'tests/utils';

test('Create Counter Contract in Web IDE then build', async ({ page }) => {
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
});
