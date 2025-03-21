import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Create Counter contract and run Unit test', async ({
  webIde,
  codeTab,
  unitTestsTab,
}) => {
  await codeTab.getCreateNewProjectButton();
  const projectName = randomUUID();
  // Create project
  await codeTab.createProject(projectName, ProjectType.CounterContract);

  await webIde.waitEditor();
  await webIde.openBuildAndDeployTab();

  await webIde.logsContain([`Project '${projectName}' is opened`]);

  // Build project
  await webIde.clickBuild();

  // Check build logs
  await webIde.logsContain([/Built Successfully/]);

  await webIde.openUnitTestsTab();
  await webIde.page.waitForTimeout(1500); // TODO: Remove this timeout after fix #249

  await expect(await unitTestsTab.getContractFileDropdown()).toBeVisible();
  await expect(await unitTestsTab.getRunButton()).toBeVisible();
  await unitTestsTab.clickRunButton();

  await webIde.page.waitForTimeout(1500);
  await webIde.logsContain([
    `Test Suites: 1 passed, 1 total`,
    `Tests:       2 passed, 2 total`,
    `Snapshots:   0 total`,
    `Ran all test suites matching /Counter.spec.js/i`,
  ]);
});
