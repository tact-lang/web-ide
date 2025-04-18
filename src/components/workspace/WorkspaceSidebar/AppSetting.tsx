import { Form, Select, Switch } from 'antd';
import { FC } from 'react';

import { useSettingAction } from '@/hooks/setting.hooks';
import s from './WorkspaceSidebar.module.scss';

const AppSetting: FC = () => {
  const {
    isContractDebugEnabled,
    toggleContractDebug,
    isFormatOnSave,
    toggleFormatOnSave,
    isAutoBuildAndDeployEnabled,
    toggleAutoBuildAndDeploy,
    getSettingStateByKey,
    updateEditorMode,
    toggleExternalMessage,
  } = useSettingAction();

  const editorMode = getSettingStateByKey('editorMode');
  const isExternalMessage = getSettingStateByKey(
    'isExternalMessage',
  ) as boolean;

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
    </>
  );
};

export default AppSetting;
