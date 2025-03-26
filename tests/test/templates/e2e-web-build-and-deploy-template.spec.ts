import { expect } from '@playwright/test';
import { test } from 'tests/fixtures/WebIde';
import {} from '../../utils';

test('Web IDE build and deploy template', async ({ webIde }) => {
  const TEMPLATE_NAME = 'The Deployable Trait';
  await webIde.waitTemplates();

  // Select template
  await webIde.selectTemplate(TEMPLATE_NAME);
  const templateContentValue = await webIde.clickUseTempalte();

  const codeBlockText = await webIde.getCodeEditorContent();
  expect(webIde.utils.normalizeString(codeBlockText)).toEqual(
    webIde.utils.normalizeString(templateContentValue || ''),
  );

  await webIde.logsContain([`Project '${TEMPLATE_NAME}' is opened`]);
  await webIde.openBuildAndDeployTab();

  // Build project
  await webIde.clickBuild();

  // Validate build logs
  await webIde.logsContain([
    /Message sent: Deploy, from EQ[A-Za-z0-9_\-\.]+, to EQ[A-Za-z0-9_\-\.]+, value \d+\.\d+, not bounced/,
    /Message sent: DeployOk, from EQ[A-Za-z0-9_\-\.]+, to EQ[A-Za-z0-9_\-\.]+, value \d+\.\d+, not bounced/,
    // /🟢 Transaction executed: success, exit_code: 0 .+, gas: .+/,
  ]);

  // Redeploy
  await webIde.clickRedeploy();

  // Validate redeploy logs
  await webIde.logsContain([
    'Deploying contract ...',
    'Contract deployed on SANDBOX  Contract address: EQ',
  ]);

  // Call contract (inrement)
  await webIde.callContractMethod('"increment":Send');

  // Validate call logs
  await webIde.logsContain([
    /Message sent: \"increment\", from EQ[A-Za-z0-9_\-\.]+, to EQ[A-Za-z0-9_\-\.]+, value \d+\.\d+/,
  ]);

  // Call contract (value)
  await webIde.callContractMethodWithoutName();

  // Validate call logs
  await webIde.logsContain(['"method": "value"', '"value": "1"']);
});
