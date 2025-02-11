import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { XTERM_LOGS_LOCATOR } from 'tests/locators';
import {
  createProject,
  getElementContent,
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

  const getLogs = () => getElementContent(page, XTERM_LOGS_LOCATOR);
  await logsContain(await getLogs(), [`Project '${projectName}' is opened`]);

  // Build contract
  await expect(page.getByRole('button', { name: 'Build' })).toBeVisible();
  await page.getByRole('button', { name: 'Build' }).click();
  await page.waitForTimeout(2000);
  // Check build logs
  await logsContain(await getLogs(), [/Built Successfully/]);
});
