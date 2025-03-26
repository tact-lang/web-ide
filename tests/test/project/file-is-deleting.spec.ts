import { randomUUID } from 'crypto';
import { test } from 'tests/fixtures/WebIde';
import { ProjectType } from 'tests/utils';

test('Check file is deleting', async ({ webIde, codeTab }) => {
  // Create project
  await codeTab.createProject(randomUUID(), ProjectType.BlankContract);

  await webIde.waitEditor();
  await webIde.focusOnEditor();

  await codeTab.checkContextButtonsForFileIsVisible('main.tact');

  // Click delete
  await codeTab.deleteFile('main.tact');
  await codeTab.fileNotExist('main.tact');
});
