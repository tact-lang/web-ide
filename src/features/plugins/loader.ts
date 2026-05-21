import { TonIdePluginSchema, type TonIdePlugin } from './types';
import { registerPlugin } from './registry';

export async function loadPluginFromUrl(url: string): Promise<TonIdePlugin> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch plugin: ${res.status}`);
  }
  const json = await res.json();
  const parsed = TonIdePluginSchema.parse(json);
  registerPlugin(parsed);
  return parsed;
}
