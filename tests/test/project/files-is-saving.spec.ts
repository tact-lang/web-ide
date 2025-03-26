import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { MONACO_LINES_LOCATOR } from 'tests/locators';
import { ProjectType } from 'tests/utils';

test('Check file is saving by keyboard', async ({ webIde, codeTab }) => {
  // Create project
  await codeTab.createProject(randomUUID(), ProjectType.BlankContract);

  await webIde.waitEditor();

  // Click in Code Editor, make focus
  await webIde.page.locator(MONACO_LINES_LOCATOR).click();

  // Start Typing
  const text = randomUUID();
  // Replace text
  await webIde.replaceTextInEditorAndSave(text);

  // Check if file is saved, reloading page
  await webIde.page.reload();

  await webIde.waitEditor();
  const codeBlockText = await webIde.getCodeEditorContent();

  await expect(codeBlockText).toBe(text);
});
