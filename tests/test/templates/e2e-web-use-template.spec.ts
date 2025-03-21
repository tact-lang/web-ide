import { expect } from '@playwright/test';
import { test } from 'tests/fixtures/WebIde';

test('Web IDE use template', async ({ webIde }) => {
  const TEMPLATE_NAME = 'The Deployable Trait';
  await webIde.waitTemplates();

  await webIde.selectTemplate(TEMPLATE_NAME);
  const templateContentValue = await webIde.clickUseTempalte();
  const codeBlockText = await webIde.getCodeEditorContent();

  // Compare code from Web IDE and template
  await expect(webIde.utils.normalizeString(codeBlockText)).toEqual(
    webIde.utils.normalizeString(templateContentValue || ''),
  );
});
