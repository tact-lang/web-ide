import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Create Counter Contract in Web IDE then build', async ({
  webIde,
  codeTab,
  buildDeployTab,
}) => {
  const projectName = randomUUID();
  // Create project
  await codeTab.createProject(projectName, ProjectType.CounterContract);

  await webIde.waitEditor();
  await webIde.openBuildAndDeployTab();

  await webIde.logsContain([`Project '${projectName}' is opened`]);

  // Build contract
  await expect(await buildDeployTab.getBuildButton()).toBeVisible();
  await buildDeployTab.clickBuildButton();
  await webIde.page.waitForTimeout(2000);
  // Check build logs
  await webIde.logsContain([/Built Successfully/]);
});
