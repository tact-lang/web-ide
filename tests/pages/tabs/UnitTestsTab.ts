import { Page } from '@playwright/test';

export class UnitTestsTab {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async getContractFileDropdown() {
    return this.page.getByText('Select .spec.ts file to run');
  }

  async getRunButton() {
    return this.page.getByRole('button', { name: 'Run' });
  }

  async clickRunButton() {
    await (await this.getRunButton()).click();
  }
}
