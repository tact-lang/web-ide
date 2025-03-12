import { SettingInterface } from '@/interfaces/setting.interface';
import fileSystem from '@/lib/fs';
import { IDEContext } from '@/state/IDE.context';
import EventEmitter from '@/utility/eventEmitter';
import { useContext } from 'react';
import { baseProjectPath } from './projectV2.hooks';

export function useSettingAction() {
  const { setting, setSetting } = useContext(IDEContext);
  const settingPath = `${baseProjectPath}/setting.json`;

  return {
    setting,
    init,
    getSettingStateByKey,
    isContractDebugEnabled,
    toggleContractDebug,
    isFormatOnSave,
    toggleFormatOnSave,
    updateTonAmountForInteraction,
    getTonAmountForInteraction,
    isAutoBuildAndDeployEnabled,
    toggleAutoBuildAndDeploy,
    updateEditorMode,
    toggleExternalMessage,
  };

  async function init() {
    const isSettingExists = await fileSystem.exists(settingPath);
    if (!isSettingExists) {
      await fileSystem.writeFile(settingPath, JSON.stringify(setting));
    }
    const settingData = await fileSystem.readFile(settingPath);
    setSetting(JSON.parse(settingData as string));
  }

  async function updateStateByKey(dataByKey: Partial<SettingInterface>) {
    const newState = {
      ...setting,
      ...dataByKey,
    };
    try {
      await fileSystem.writeFile(settingPath, JSON.stringify(newState), {
        overwrite: true,
      });
      setSetting(newState);
    } catch (error) {
      EventEmitter.emit('LOG', {
        text: `Setting update error:  ${(error as Error).message}`,
        type: 'error',
        timestamp: Date.now().toLocaleString(),
      });
    }
  }

  function getSettingStateByKey(key: keyof SettingInterface) {
    return setting[key];
  }

  function isContractDebugEnabled() {
    return setting.contractDebug;
  }

  function toggleContractDebug(active: boolean = !setting.contractDebug) {
    updateStateByKey({
      contractDebug: active,
    });
  }

  function isFormatOnSave() {
    return setting.formatOnSave;
  }

  function toggleFormatOnSave(active: boolean = !setting.formatOnSave) {
    updateStateByKey({
      formatOnSave: active,
    });
  }

  function getTonAmountForInteraction() {
    return setting.tonAmountForInteraction ?? '0.05';
  }

  function updateTonAmountForInteraction(value: string, reset = false) {
    updateStateByKey({
      tonAmountForInteraction: reset ? '0.05' : value,
    });
  }

  function isAutoBuildAndDeployEnabled() {
    return setting.autoBuildAndDeploy ?? true;
  }

  function toggleAutoBuildAndDeploy(
    active: boolean = !setting.autoBuildAndDeploy,
  ) {
    updateStateByKey({
      autoBuildAndDeploy: active,
    });
  }

  function updateEditorMode(mode: 'default' | 'vim') {
    updateStateByKey({
      editorMode: mode,
    });
  }

  function toggleExternalMessage(active: boolean = !setting.isExternalMessage) {
    updateStateByKey({
      isExternalMessage: active,
    });
  }
}
