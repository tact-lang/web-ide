import { Page } from '@playwright/test';

export class Utils {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  base64encode(str: string) {
    return Buffer.from(str).toString('base64');
  }

  normalizeString = (str: string) =>
    str.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
}

export enum ProjectType {
  BlankContract = 'Blank Contract',
  CounterContract = 'Counter Contract',
}
