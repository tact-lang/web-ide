import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Init git in new project', async ({ webIde, codeTab, gitTab }) => {
  // Create project
  await codeTab.createProject(randomUUID(), ProjectType.BlankContract);

  // Open git tab
  await webIde.openGitTab();
  (await gitTab.getInitButton()).isVisible();
  await gitTab.clickInit();
  await gitTab.checkCommonElements();

  // Open Code tab
  await webIde.openCodeTab();

  // Remove git folder
  await webIde.removeFolder(/^\.git$/);

  // Check Git tab is empty
  await webIde.openGitTab();

  await expect(await gitTab.getTabHeader()).toBeVisible();
  await expect(await gitTab.getInitButton()).toBeVisible();
});
