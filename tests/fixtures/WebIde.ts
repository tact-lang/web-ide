import { test as base } from '@playwright/test';
import { BuildDeployTab } from 'tests/pages/tabs/BuildDeployTab';
import { CodeTab } from 'tests/pages/tabs/CodeTab';
import { GitTab } from 'tests/pages/tabs/GitTab';
import { MistiTab } from 'tests/pages/tabs/MistiTab';
import { UnitTestsTab } from 'tests/pages/tabs/UnitTestsTab';
import { WebIdePage } from 'tests/pages/WebIdePage';

type WebIdeFixture = {
  webIde: WebIdePage;
  codeTab: CodeTab;
  buildDeployTab: BuildDeployTab;
  unitTestsTab: UnitTestsTab;
  mistiTab: MistiTab;
  gitTab: GitTab;
};

export const test = base.extend<WebIdeFixture>({
  webIde: async ({ page }, use) => {
    const webIdePage = new WebIdePage(page);
    await webIdePage.goto();
    await use(webIdePage);
  },
  codeTab: async ({ webIde }, use) => {
    const codeTab = new CodeTab(webIde.page);
    await use(codeTab);
  },
  buildDeployTab: async ({ webIde }, use) => {
    const buildDeployTab = new BuildDeployTab(webIde.page);
    await use(buildDeployTab);
  },
  unitTestsTab: async ({ webIde }, use) => {
    const unitTestsTab = new UnitTestsTab(webIde.page);
    await use(unitTestsTab);
  },
  mistiTab: async ({ webIde }, use) => {
    const mistiTab = new MistiTab(webIde.page);
    await use(mistiTab);
  },
  gitTab: async ({ webIde }, use) => {
    const gitTab = new GitTab(webIde.page);
    await use(gitTab);
  },
});
