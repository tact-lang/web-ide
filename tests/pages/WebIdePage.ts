import { expect, Page } from '@playwright/test';
import {
  BUILD_AND_DEPLOY_LOCATOR,
  CODE_TAB_LOCATOR,
  GIT_TAB_LOCATOR,
  MISTI_TAB_LOCATOR,
  MONACO_LINES_LOCATOR,
  PROJECT_DROPDOWN_LOCATOR,
  UNIT_TESTS_LOCATOR,
  XTERM_LOGS_LOCATOR,
} from 'tests/locators';
import { Utils } from 'tests/utils';

export class WebIdePage {
  readonly page: Page;
  private baseUrl: string;
  public utils: Utils;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = process.env.APP_DOMAIN || 'https://ide.ton.org/';
    this.utils = new Utils(this.page);
  }

  async goto() {
    await this.page.goto(this.baseUrl);
  }

  async waitEditor() {
    const codeBlock = this.page.locator(MONACO_LINES_LOCATOR);

    await expect(this.page.getByText('Loading...', { exact: true }), {
      message: 'Editor should be loaded',
    }).not.toBeVisible();

    await expect(codeBlock, {
      message: 'Editor should be visible',
    }).toBeInViewport();
    return await expect(this.page.locator(MONACO_LINES_LOCATOR)).toBeVisible();
  }

  async focusOnEditor() {
    await this.page.locator(MONACO_LINES_LOCATOR).click();
  }

  async replaceTextInEditorAndSave(text: string) {
    // Select all
    await this.page.keyboard.press('Control+a');
    // Replace all with random text
    await this.page.keyboard.type(text);
    // Save
    await this.page.keyboard.press('Control+s');
    await this.page.waitForTimeout(1000);
  }

  async logsContain(expectedValues: string[] | RegExp[]) {
    for (const expectedValue of expectedValues) {
      console.log(expectedValue);
      await expect(this.page.locator(XTERM_LOGS_LOCATOR)).toContainText(
        expectedValue,
        { useInnerText: true },
      );
    }
  }

  //#region Tabs

  async openCodeTab() {
    await this.page.locator(CODE_TAB_LOCATOR).first().click();
    await this.waitEditor();
  }

  async openBuildAndDeployTab() {
    await this.page.locator(BUILD_AND_DEPLOY_LOCATOR).first().click();
    // wait smth
  }

  async openUnitTestsTab() {
    await this.page.locator(UNIT_TESTS_LOCATOR).first().click();
    // wait smth
  }

  async openMistiTab() {
    await this.page.locator(MISTI_TAB_LOCATOR).first().click();
    // wait smth
  }

  async openGitTab() {
    await this.page.locator(GIT_TAB_LOCATOR).first().click();
  }

  //#endregion Tabs

  async waitTemplates() {
    await expect(
      this.page.getByRole('heading', { name: 'Tact Templates:' }),
    ).toBeVisible();
  }

  async selectTemplate(templateName: string) {
    await expect(this.page.getByText(templateName)).toBeVisible();
    await this.page.getByText(templateName).click();
  }

  async clickUseTempalte() {
    const templatePre = this.page.locator('pre').locator('div').first();
    await expect(templatePre).toBeVisible();
    const templateContentValue = await templatePre.textContent();
    await expect(
      this.page.getByRole('button', { name: 'Use in IDE' }),
    ).toBeVisible();
    await this.page.getByRole('button', { name: 'Use in IDE' }).click();
    await this.waitEditor();

    return templateContentValue;
  }

  async removeFolder(folderName: string | RegExp) {
    await expect(
      this.page
        .getByRole('listitem')
        .filter({ hasText: folderName })
        .locator('div')
        .first(),
    ).toBeVisible();

    await this.page
      .getByRole('listitem')
      .filter({ hasText: folderName })
      .locator('div')
      .first()
      .hover();

    await this.page
      .getByRole('listitem')
      .filter({ hasText: folderName })
      .locator('span')
      .nth(4)
      .click();

    // Check folder is removed
    await expect(
      this.page.locator('listitem').filter({ hasText: folderName }).first(),
    ).not.toBeVisible();
  }

  async clickBuild() {
    await expect(
      this.page.getByRole('button', { name: 'Build' }),
    ).toBeVisible();
    await this.page.getByRole('button', { name: 'Build' }).click();
    await this.page.waitForTimeout(2000);
  }

  async clickRedeploy() {
    await expect(
      this.page.getByRole('button', { name: 'Redeploy' }),
    ).toBeVisible();
    await this.page.getByRole('button', { name: 'Redeploy' }).click();
    await this.page.waitForTimeout(1500);
  }

  async callContractMethod(method: string) {
    await expect(this.page.getByText(method)).toBeVisible();
    await this.page.getByRole('button', { name: 'Send' }).click();
    await this.page.waitForTimeout(500);
  }

  async callContractMethodWithoutName() {
    await expect(this.page.getByRole('button', { name: 'Call' })).toBeVisible();
    await this.page.getByRole('button', { name: 'Call' }).click();
    await this.page.waitForTimeout(500);
  }

  async getCodeEditorContent() {
    const selector = MONACO_LINES_LOCATOR;
    return this.page.evaluate((selector) => {
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

  async getProjectName() {
    const projectDropdown = this.page.locator(PROJECT_DROPDOWN_LOCATOR);
    await expect(projectDropdown).toBeVisible();
    return projectDropdown.textContent();
  }
}
