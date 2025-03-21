import { expect, Page } from '@playwright/test';

export class GitTab {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async getInitButton() {
    return this.page.getByRole('button', { name: 'Initialize Git' });
  }

  async clickInit() {
    await (await this.getInitButton()).click();
  }

  async getTabHeader() {
    return this.page.getByText('Git Version Control');
  }

  async checkTabHeader() {
    await expect(await this.getTabHeader()).toBeVisible();
  }

  async checkChangesPane() {
    await expect(
      this.page.getByRole('button', { name: 'caret-right Changes' }),
    ).toBeVisible();
  }

  async checkRemotePane() {
    await expect(
      this.page.getByRole('button', { name: 'caret-right Remote' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('textbox', { name: 'GitHub repository URL' }),
    ).toBeVisible();
    await expect(
      this.page
        .locator('div')
        .filter({ hasText: /^Remote Save$/ })
        .locator('button'),
    ).toBeVisible();
  }

  async checkSyncPane() {
    await expect(this.page.getByRole('button', { name: 'Pull' })).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: 'caret-right Sync' }),
    ).toBeVisible();
    await expect(this.page.getByText('Force Push')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Push' })).toBeVisible();
  }

  async checkSettingPane() {
    await expect(
      this.page.getByRole('button', { name: 'caret-right Setting' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('textbox', { name: 'Username, e.g., John Doe' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('textbox', { name: 'Email' }),
    ).toBeVisible();
    await expect(
      this.page.getByRole('textbox', { name: 'Git Personal Access Token' }),
    ).toBeVisible();
    await expect(
      this.page.getByText('Guide to create a personal'),
    ).toBeVisible();
    await expect(
      this.page
        .locator('form')
        .filter({ hasText: 'Guide to create a personal' })
        .getByRole('button'),
    ).toBeVisible();
  }

  async checkCommonElements() {
    await this.checkTabHeader();
    await this.checkChangesPane();
    await this.checkRemotePane();
    await this.checkSyncPane();
    await this.checkSettingPane();
  }
}
