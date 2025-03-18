import { Project } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import { iFileTabSchema } from '@/schemas/fileTab.schema';
import { IFileTab } from '@/state/IDE.context';
import cloneDeep from 'lodash.clonedeep';
import EventEmitter from './eventEmitter';

export const DEFAULT_PROJECT_SETTING = {
  tab: {
    items: [],
    active: null,
  },
};

type ProjectSettingWithTab = Project & IFileTab;

export async function updateProjectTabSetting(
  projectPath: string | undefined,
  updatedTab: IFileTab | null,
  defaultFilePath?: string,
): Promise<IFileTab> {
  if (!projectPath) return DEFAULT_PROJECT_SETTING.tab;
  const settingPath = `${projectPath}/.ide/setting.json`;

  try {
    await ensureSettingFileExists(settingPath);

    let parsedSetting = await readSettingFile(settingPath);

    if (updatedTab) {
      parsedSetting.tab = updatedTab;
    } else {
      parsedSetting = { ...DEFAULT_PROJECT_SETTING, ...parsedSetting };
    }

    let clonedTab: IFileTab | undefined = cloneDeep(parsedSetting.tab);

    if (!clonedTab?.active && defaultFilePath) {
      clonedTab = {
        active: { path: defaultFilePath, type: 'default' },
        items: [
          {
            name: defaultFilePath.split('/').pop() ?? defaultFilePath,
            path: defaultFilePath,
            isDirty: false,
            type: 'default',
          },
        ],
      };
      parsedSetting.tab = clonedTab;
    }

    try {
      parsedSetting.tab = iFileTabSchema.parse(parsedSetting.tab);
    } catch (error) {
      parsedSetting.tab = DEFAULT_PROJECT_SETTING.tab;
    }

    await writeSettingFile(settingPath, parsedSetting);
    return cloneDeep(parsedSetting.tab) ?? DEFAULT_PROJECT_SETTING.tab;
  } catch (error) {
    console.error('Error syncing tab settings:', error);
    return DEFAULT_PROJECT_SETTING.tab;
  }
}

/**
 * Ensure the setting file exists and initialize it with default content if it doesn't.
 */
async function ensureSettingFileExists(settingPath: string) {
  if (!(await fileSystem.exists(settingPath))) {
    await fileSystem.writeFile(
      settingPath,
      JSON.stringify(DEFAULT_PROJECT_SETTING, null, 4),
      {
        overwrite: true,
      },
    );
  }
}

/**
 * Read and parse the settings file.
 */
async function readSettingFile(settingPath: string) {
  const settingContent = (await fileSystem.readFile(settingPath)) as string;
  return settingContent
    ? JSON.parse(settingContent)
    : { ...DEFAULT_PROJECT_SETTING };
}

/**
 * Write the updated settings to the file.
 */
async function writeSettingFile(
  settingPath: string,
  parsedSetting: ProjectSettingWithTab,
) {
  await fileSystem.writeFile(
    settingPath,
    JSON.stringify(parsedSetting, null, 2),
    {
      overwrite: true,
    },
  );
  EventEmitter.emit('FORCE_UPDATE_FILE', settingPath);
}
