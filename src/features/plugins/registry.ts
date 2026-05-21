import type { TonIdePlugin } from './types';

const STORAGE_KEY = 'ton_ide_plugins';

let plugins: TonIdePlugin[] = [];

export function loadPluginsFromStorage(): TonIdePlugin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      plugins = JSON.parse(raw) as TonIdePlugin[];
    }
  } catch {
    plugins = [];
  }
  return plugins;
}

export function savePluginsToStorage(list: TonIdePlugin[]) {
  plugins = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getEnabledPlugins(): TonIdePlugin[] {
  if (plugins.length === 0) {
    loadPluginsFromStorage();
  }
  return plugins;
}

export function registerPlugin(plugin: TonIdePlugin) {
  const list = getEnabledPlugins().filter((p) => p.id !== plugin.id);
  list.push(plugin);
  savePluginsToStorage(list);
}

export function removePlugin(id: string) {
  savePluginsToStorage(getEnabledPlugins().filter((p) => p.id !== id));
}

export const BUNDLED_PLUGIN: TonIdePlugin = {
  id: 'tep74-checklist',
  name: 'TEP-74 Checklist',
  version: '1.0.0',
  skills: [
    {
      id: 'tep74-checklist',
      name: 'TEP-74 Checklist',
      content: `When reviewing jettons verify: master supplies wallet code, transfer notifies, bounce handling, metadata (TEP-64), and sandbox tests for mint/transfer/burn.`,
    },
  ],
};
