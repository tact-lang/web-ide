import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Check file is sharing', async ({ webIde, codeTab, browserName }) => {
  test.skip(
    ['firefox', 'webkit'].includes(browserName),
    'clipboard not working on theese browsers',
  );

  // Create project
  await codeTab.createProject(randomUUID(), ProjectType.BlankContract);
  await webIde.waitEditor();

  await codeTab.checkContextButtonsForFileIsVisible('main.tact');

  // Click in Code Editor, make focus
  await webIde.focusOnEditor();

  // Edit, make file some random
  const text = randomUUID();
  await webIde.replaceTextInEditorAndSave(text);

  // Click share
  await codeTab.shareFile('main.tact');

  // Open link from clipboard
  const clipboardContent = await webIde.page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardContent).toMatch(
    /https:\/\/[A-Za-z\-]{0,14}.ton.org\/\?code=.*/,
  );

  // Open link in new tab
  await webIde.page.goto(clipboardContent);
  await webIde.waitEditor();

  const codeBlockText = await webIde.getCodeEditorContent();

  expect(codeBlockText).toBe(text);
  await codeTab.cloneProject();

  // Validate that project name is "temp" is active
  expect(await codeTab.getActiveProject()).toBe('temp');
});
