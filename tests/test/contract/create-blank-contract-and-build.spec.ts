import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Create Blank Contract in Web IDE then build', async ({
  webIde,
  codeTab,
  buildDeployTab,
}) => {
  const projectName = randomUUID();
  await codeTab.getCreateNewProjectButton();

  // Create new project
  await codeTab.createProject(projectName, ProjectType.BlankContract);

  await webIde.waitEditor();
  await webIde.openBuildAndDeployTab();

  await webIde.logsContain([`Project '${projectName}' is opened`]);

  // Build contract
  await expect(await buildDeployTab.getBuildButton()).toBeVisible();
  await buildDeployTab.clickBuildButton();
  await webIde.page.waitForTimeout(2000);

  // Check build logs
  await webIde.logsContain([
    /Message sent: Deploy, from [A-Za-z0-9._-]{1,10}, to [A-Za-z0-9._-]{1,10}, value 0\.05, not bounced/,
    /Message sent: DeployOk, from [A-Za-z0-9._-]{1,10}, to [A-Za-z0-9._-]{1,10}, value 0.\d+/,
  ]);
});
