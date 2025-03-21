import { encodeBase64 } from '@/utility/utils';
import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import {} from 'tests/utils';

test('Clone code from shared link to local', async ({
  webIde,
  browserName,
  codeTab,
}) => {
  test.skip(
    ['firefox', 'webkit'].includes(browserName),
    'Clipboard API not working on theese browsers',
  );

  // Generate share code
  const shareCode = `contract ${randomUUID()} with Deployable {\n\n\n}`;
  const url = `https://ide.ton.org/?code=${encodeBase64(shareCode)}&lang=tact`;
  const projectName = randomUUID();

  // Open page with share code
  await webIde.page.goto(url);
  await codeTab.openFile(/^main\.tact$/);
  await webIde.waitEditor();

  const ideCodeBefore = await webIde.getCodeEditorContent();

  // Validate that project name is "temp" is active
  expect(await codeTab.getActiveProject()).toBe('temp');
  expect(webIde.utils.normalizeString(ideCodeBefore)).toBe(
    webIde.utils.normalizeString(shareCode),
  );
  await codeTab.cloneProjectButtonClick();
  await codeTab.cloneProject(projectName);

  // Validate that project name is new
  await expect(await codeTab.getActiveProjectLocator()).toHaveText(projectName);
  await codeTab.openFile(/^main\.tact$/);
  await webIde.page.waitForTimeout(200);

  // Validate IDE code
  const ideCodeAfter = await webIde.getCodeEditorContent();

  expect(webIde.utils.normalizeString(ideCodeAfter)).toBe(
    webIde.utils.normalizeString(shareCode),
  );
});
