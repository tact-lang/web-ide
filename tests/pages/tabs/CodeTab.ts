import { expect, Page } from '@playwright/test';
import {
  CLONE_PROJECT_LOCATOR,
  DELETE_PROJECT_LOCATOR,
  PROJECT_DROPDOWN_LOCATOR,
} from 'tests/locators';
import { ProjectType } from 'tests/utils';

export class CodeTab {
  readonly page: Page;
  constructor(page: Page) {
    this.page = page;
  }

  async getActiveProjectLocator() {
    return this.page.getByText('Explorer').locator(PROJECT_DROPDOWN_LOCATOR);
  }

  async getActiveProject() {
    return await this.page
      .getByText('Explorer')
      .locator(PROJECT_DROPDOWN_LOCATOR)
      .textContent();
  }

  async getCreateNewProjectButton() {
    return this.page.getByRole('button', {
      name: 'Create a new project',
    });
  }

  async getDeleteButton() {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  async getCancelButton() {
    return this.page.getByRole('button', { name: 'Cancel' });
  }

  async createProject(name: string, templateName: ProjectType) {
    await expect(await this.getCreateNewProjectButton()).toBeVisible();
    await (await this.getCreateNewProjectButton()).click();

    // Select Blank Contract
    await this.page.getByRole('textbox', { name: 'Project name' }).click();
    await this.page.getByRole('textbox', { name: 'Project name' }).fill(name);

    await expect(this.page.getByText('TactFunc')).toBeVisible();
    await expect(
      this.page.getByText('Blank ContractCounter Contract'),
    ).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: 'Create', exact: true }),
    ).toBeVisible();

    // Select Template
    await this.page.getByText(templateName).click();
    // Create project
    await this.page
      .getByRole('button', { name: 'Create', exact: true })
      .click();

    // Validate created project
    await expect(
      this.page.getByText('Explorer').locator(PROJECT_DROPDOWN_LOCATOR),
    ).toBeVisible();
    await expect(await this.getActiveProjectLocator()).toHaveText(name);
  }

  async deleteProject(projectName: string) {
    await expect(this.page.locator(DELETE_PROJECT_LOCATOR)).toBeVisible();
    await this.page.locator(DELETE_PROJECT_LOCATOR).first().click();

    await expect(
      this.page.getByText(`Delete my \`${projectName}\` Project?`),
    ).toBeVisible();
    await expect(await this.getCancelButton()).toBeVisible();
    await expect(await this.getDeleteButton()).toBeVisible();
    await (await this.getDeleteButton()).click();

    // Check that project is deleted
    await expect(await this.getCreateNewProjectButton()).toBeVisible();
  }

  async checkContextButtonsForFileIsVisible(fileName: string) {
    // Hover mouse to listitem
    await this.page.getByRole('listitem').filter({ hasText: fileName }).hover();

    // Check edit, share, delete buttons for created project file
    for (let i = 0; i < 3; i++) {
      await expect(
        this.page
          .getByRole('listitem')
          .filter({ hasText: fileName })
          .locator('span')
          .nth(i),
      ).toBeVisible();
    }
  }

  async deleteFile(fileName: string | RegExp) {
    await this.page
      .getByRole('listitem')
      .filter({ hasText: fileName })
      .getByRole('img')
      .nth(2)
      .click();
  }

  async fileNotExist(fileName: string | RegExp) {
    // Check file not exists
    await expect(
      this.page
        .getByRole('listitem')
        .filter({ hasText: fileName })
        .locator('div')
        .first(),
    ).not.toBeVisible();

    // Check context buttons not exists
    for (let i = 0; i < 3; i++) {
      await expect(
        this.page
          .getByRole('listitem')
          .filter({ hasText: fileName })
          .locator('span')
          .nth(i),
      ).not.toBeVisible();
    }
  }

  async shareFile(fileName: string | RegExp) {
    await this.page.getByRole('listitem').filter({ hasText: fileName }).hover();
    await this.page
      .getByRole('listitem')
      .filter({ hasText: fileName })
      .getByRole('img')
      .nth(1)
      .click();
  }

  async openFile(fileName: string | RegExp) {
    await this.page.locator('div').filter({ hasText: fileName }).nth(1).click();
  }

  async cloneProjectButtonLocator() {
    return this.page.locator(CLONE_PROJECT_LOCATOR);
  }

  async cloneProjectButtonClick() {
    await (await this.cloneProjectButtonLocator()).click();
  }

  async cloneProjectButtonIsVisible() {
    await expect(await this.cloneProjectButtonLocator()).toBeVisible();
  }

  async cloneProject(projectName: string) {
    await expect(
      this.page.getByRole('textbox', { name: 'Project name' }),
    ).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Save' })).toBeVisible();
    await this.page.getByRole('textbox', { name: 'Project name' }).click();
    await this.page
      .getByRole('textbox', { name: 'Project name' })
      .fill(projectName);
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}
