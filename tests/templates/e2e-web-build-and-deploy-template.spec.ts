import { expect, test } from '@playwright/test';
import { MONACO_LINES_LOCATOR } from '../locators';
import {
  getElementContent,
  isCodeEditorLoaded,
  logsContain,
  normalizeString,
  openBuildAndDeployTab,
} from '../utils';

test('Web IDE build and deploy template', async ({ page }) => {
  const TEMPLATE_NAME = 'The Deployable Trait';

  // Open Web IDE
  await page.goto('https://ide.ton.org/');
  await expect(
    page.getByRole('heading', { name: 'Tact Templates:' }),
  ).toBeVisible();

  // Select template
  await expect(page.getByText(TEMPLATE_NAME)).toBeVisible();
  await page.getByText(TEMPLATE_NAME).click();

  const templatePre = page.locator('pre').locator('div').first();
  await expect(templatePre).toBeVisible();

  // Load and Use template
  const templateContentValue = await templatePre.textContent();
  await expect(page.getByRole('button', { name: 'Use in IDE' })).toBeVisible();
  await page.getByRole('button', { name: 'Use in IDE' }).click();
  await isCodeEditorLoaded(page);

  const codeBlockText = await getElementContent(page, MONACO_LINES_LOCATOR);
  await expect(normalizeString(codeBlockText)).toEqual(
    normalizeString(templateContentValue || ''),
  );

  await logsContain(page, [`Project '${TEMPLATE_NAME}' is opened`]);

  // Open Build and Deploy tab
  await openBuildAndDeployTab(page);

  // Build project
  await expect(page.getByRole('button', { name: 'Build' })).toBeVisible();
  await page.getByRole('button', { name: 'Build' }).click();
  await page.waitForTimeout(2000);

  // Validate build logs
  await logsContain(page, [
    'Message sent: Deploy, from EQAB..wSnT, to EQBK..v0_-, value 0.05, not bounced',
    'Message sent: DeployOk, from EQBK..v0_-, to EQAB..wSnT, value 0.0465792, not bounced',
    'Transaction Executed: success, Exit Code: 0, Gas: 0.0029424',
    'Transaction Executed: success, Exit Code: 0, Gas: 0.0001236',
  ]);

  // Redeploy
  await expect(page.getByRole('button', { name: 'Redeploy' })).toBeVisible();
  await page.getByRole('button', { name: 'Redeploy' }).click();
  await page.waitForTimeout(1500);

  // Validate redeploy logs
  await logsContain(page, [
    'Deploying contract ...',
    'Contract deployed on SANDBOX  Contract address: EQ',
  ]);

  // Call contract (inrement)
  await expect(page.getByText('"increment":Send')).toBeVisible();
  await page.getByRole('button', { name: 'Send' }).click();
  await page.waitForTimeout(500);

  // Validate call logs
  await logsContain(page, [
    'Message sent: "increment", from EQAB..wSnT, to EQBK..v0_-, value 0.05',
    'Transaction Executed: success, Exit Code: 0, Gas: 0.0014712',
  ]);

  // Call contract (value)
  await expect(page.getByRole('button', { name: 'Call' })).toBeVisible();
  await page.getByRole('button', { name: 'Call' }).click();
  await page.waitForTimeout(500);

  // Validate call logs
  await logsContain(page, ['"method": "value"', '"value": "1"']);
});
