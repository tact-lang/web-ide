import AppIcon from '@/components/ui/icon';
import { Form, Input, Select, Switch } from 'antd';
import React, { FC, useCallback } from 'react';

import { useSettingAction } from '@/hooks/setting.hooks';
import s from './WorkspaceSidebar.module.scss';

const AppSetting: FC = () => {
  const {
    isContractDebugEnabled,
    toggleContractDebug,
    isFormatOnSave,
    toggleFormatOnSave,
    updateTonAmountForInteraction,
    getTonAmountForInteraction,
    isAutoBuildAndDeployEnabled,
    toggleAutoBuildAndDeploy,
    getSettingStateByKey,
    updateEditorMode,
    toggleExternalMessage,
    toggleMasterChain,
  } = useSettingAction();

  const editorMode = getSettingStateByKey('editorMode');
  const isExternalMessage = getSettingStateByKey(
    'isExternalMessage',
  ) as boolean;
  const isMasterChainEnabled = getSettingStateByKey('masterchain');

  const handleTonAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (!isNaN(Number(value))) {
        updateTonAmountForInteraction(value);
      }
    },
    [updateTonAmountForInteraction],
  );

  const resetTonAmount = useCallback(() => {
    updateTonAmountForInteraction('', true);
  }, [updateTonAmountForInteraction]);

  return (
    <>
      <div className={s.settingItem}>
        <Form.Item
          style={{ marginBottom: 0 }}
          label="Debug Contract"
          valuePropName="checked"
        >
          <Switch
            checked={isContractDebugEnabled()}
            onChange={toggleContractDebug}
          />
        </Form.Item>
        <p className={s.description}>
          Contract rebuild and redeploy required after an update
        </p>
      </div>

      <div className={s.settingItem}>
        <Form.Item label="External Message" valuePropName="checked">
          <Switch
            checked={isExternalMessage}
            onChange={toggleExternalMessage}
          />
        </Form.Item>
      </div>

      <div className={s.settingItem}>
        <Form.Item label="Masterchain" valuePropName="checked">
          <Switch
            checked={!!isMasterChainEnabled}
            onChange={(toggleState) => {
              toggleMasterChain(toggleState);
            }}
          />
        </Form.Item>
      </div>

      <div className={s.settingItem}>
        <Form.Item label="Format code on save" valuePropName="checked">
          <Switch checked={isFormatOnSave()} onChange={toggleFormatOnSave} />
        </Form.Item>
      </div>

      <div className={s.settingItem}>
        <Form.Item
          label="Auto Build & Deploy in Sandbox"
          valuePropName="checked"
        >
          <Switch
            checked={isAutoBuildAndDeployEnabled()}
            onChange={toggleAutoBuildAndDeploy}
          />
        </Form.Item>
        <p className={s.description}>
          Automatically build and deploy the smart contract after the file is
          saved <br /> if the environment is set to Sandbox.
        </p>
      </div>

      <div className={s.settingItem}>
        <Form.Item label="Editor Mode">
          <Select
            style={{ width: '10rem' }}
            value={editorMode}
            onChange={(value) => {
              updateEditorMode(value as 'default' | 'vim');
            }}
          >
            <Select.Option value="default">Default</Select.Option>
            <Select.Option value="vim">Vim</Select.Option>
          </Select>
        </Form.Item>
      </div>

      <div className={s.settingItem}>
        <Form.Item
          style={{ marginBottom: 0 }}
          label="TON Amount for Interaction"
        >
          <Input
            style={{ marginBottom: 0, width: '6rem' }}
            value={getTonAmountForInteraction()}
            onChange={handleTonAmountChange}
            placeholder="in TON"
            suffix={
              <div
                title="Reset"
                className={s.resetAmount}
                onClick={resetTonAmount}
              >
                <AppIcon name="Reload" />
              </div>
            }
          />
        </Form.Item>
        <p className={s.description}>
          This amount will be used for all the <br /> contract interaction like
          deployment and sending internal messages.
        </p>
      </div>
    </>
  );
};

export default AppSetting;
