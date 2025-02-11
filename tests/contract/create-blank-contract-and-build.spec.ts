import { expect, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import {
  isCodeEditorLoaded,
  logsContain,
  openBuildAndDeployTab,
} from 'tests/utils';

test('Create Blank Contract in Web IDE then build', async ({ page }) => {
  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  await expect(
    page.getByRole('button', { name: 'Create a new project' }),
  ).toBeVisible();
  // Create new project
  await page.getByRole('button', { name: 'Create a new project' }).click();

  // Select Blank Contract
  const projectName = randomUUID();
  await page.getByRole('textbox', { name: 'Project name' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(projectName);

  await expect(page.getByText('TactFunc')).toBeVisible();
  await expect(page.getByText('Blank ContractCounter Contract')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible();

  await page.getByText('Blank Contract').click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await isCodeEditorLoaded(page);
  await openBuildAndDeployTab(page);

  await logsContain(page, [`Project '${projectName}' is opened`]);

  // Build contract
  await expect(page.getByRole('button', { name: 'Build' })).toBeVisible();
  await page.getByRole('button', { name: 'Build' }).click();
  await page.waitForTimeout(2000);

  // Check build logs
  await logsContain(page, [
    /Message sent: Deploy, from [A-Za-z0-9._-]{1,10}, to [A-Za-z0-9._-]{1,10}, value 0\.05, not bounced/,
    /Transaction Executed: success, Exit Code: 0, Gas: 0.0028824/,
    /Message sent: DeployOk, from [A-Za-z0-9._-]{1,10}, to [A-Za-z0-9._-]{1,10}, value 0.0466392/,
    /Transaction Executed: success, Exit Code: 0, Gas: 0.0001236/,
  ]);
});
