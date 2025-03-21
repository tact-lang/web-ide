import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Create Blank Contract in Web IDE then delete', async ({ codeTab }) => {
  await codeTab.getCreateNewProjectButton();
  const projectName = randomUUID();
  // Create project
  await codeTab.createProject(projectName, ProjectType.BlankContract);

  // Delete project
  await codeTab.deleteProject(projectName);

  // Create project button should be visible
  await expect(await codeTab.getCreateNewProjectButton()).toBeVisible();
});
