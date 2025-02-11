import { expect, Page } from '@playwright/test';
import {
  BUILD_AND_DEPLOY_LOCATOR,
  CODE_TAB_LOCATOR,
  GIT_TAB_LOCATOR,
  MONACO_LINES_LOCATOR,
  PROJECT_DROPDOWN_LOCATOR,
  UNIT_TESTS_LOCATOR,
} from './locators';

export async function getElementContent(page: Page, selector: string) {
  return page.evaluate((selector) => {
    const element = document.evaluate(
      selector,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue as HTMLElement;

    if (!element) return '';

    return Array.from(element.childNodes)
      .map((node) => node.textContent)
      .join('\n');
  }, selector);
}

export async function logsContain(
  logs: string,
  expectedValues: string[] | RegExp[],
) {
  for (const expectedValue of expectedValues) {
    await expect(logs).toMatch(expectedValue);
  }
}

export const normalizeString = (str: string) =>
  str.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();

export async function openCodeTab(page: Page) {
  await page.locator(CODE_TAB_LOCATOR).first().click();
}

export async function openBuildAndDeployTab(page: Page) {
  await page.locator(BUILD_AND_DEPLOY_LOCATOR).first().click();
}

export async function openUnitTests(page: Page) {
  await page.locator(UNIT_TESTS_LOCATOR).first().click();
}

export async function openGitTab(page: Page) {
  await page.locator(GIT_TAB_LOCATOR).first().click();
}

export async function isCodeEditorLoaded(page: Page) {
  const codeBlock = page.locator(MONACO_LINES_LOCATOR);

  await expect(page.getByText('Loading...', { exact: true }), {
    message: 'Editor should be loaded',
  }).not.toBeVisible();
  await expect(codeBlock, {
    message: 'Editor should be visible',
  }).toBeVisible();
}

export enum ProjectType {
  BlankContract = 'Blank Contract',
  CounterContract = 'Counter Contract',
}

export async function createProject(
  page: Page,
  name: string,
  templateName: ProjectType,
) {
  await expect(
    page.getByRole('button', { name: 'Create a new project' }),
  ).toBeVisible();
  // Create new project
  await page.getByRole('button', { name: 'Create a new project' }).click();

  // Select Blank Contract
  await page.getByRole('textbox', { name: 'Project name' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill(name);

  await expect(page.getByText('TactFunc')).toBeVisible();
  await expect(page.getByText('Blank ContractCounter Contract')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create', exact: true }),
  ).toBeVisible();

  // Select Template
  await page.getByText(templateName).click();
  // Create project
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  // Validate created project
  await expect(
    page.getByText('Explorer').locator(PROJECT_DROPDOWN_LOCATOR),
  ).toBeVisible();
  await expect(await getActiveProjectLocator(page)).toHaveText(name);
}

export async function getActiveProjectLocator(page: Page) {
  return await page.getByText('Explorer').locator(PROJECT_DROPDOWN_LOCATOR);
}

export async function getActiveProject(page: Page) {
  return await page
    .getByText('Explorer')
    .locator(PROJECT_DROPDOWN_LOCATOR)
    .textContent();
}

export async function checkContextButtonsForFileIsVisible(
  page: Page,
  fileName: string,
) {
  // Hover mouse to listitem
  await page.getByRole('listitem').filter({ hasText: fileName }).hover();

  // Check edit, share, delete buttons for created project file
  for (let i = 0; i < 3; i++) {
    await expect(
      page
        .getByRole('listitem')
        .filter({ hasText: fileName })
        .locator('span')
        .nth(i),
    ).toBeVisible();
  }
}

export function base64encode(str: string) {
  return Buffer.from(str).toString('base64');
}
