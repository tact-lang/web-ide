import { Page } from '@playwright/test';

export class BuildDeployTab {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async getBuildButton() {
    return this.page.getByRole('button', { name: 'Build' });
  }

  async clickBuildButton() {
    await (await this.getBuildButton()).click();
  }
}
