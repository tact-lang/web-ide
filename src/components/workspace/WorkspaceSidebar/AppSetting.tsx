import PluginSettings from '@/features/plugins/PluginSettings';
import { useProject } from '@/hooks/projectV2.hooks';
import {
  buildShareImportUrl,
  writeSharedContext,
} from '@/utility/sharedContext';
import { Form, Select, Switch, Input, Button } from 'antd';
import { FC, useState } from 'react';

import { useSettingAction } from '@/hooks/setting.hooks';
import s from './WorkspaceSidebar.module.scss';

const AppSetting: FC = () => {
  const { activeProject } = useProject();
  const [shareNote, setShareNote] = useState('');
  const [shareUrl, setShareUrl] = useState('');

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

      <div className={s.settingItem}>
        <Form.Item label="TON IDE Plugins">
          <PluginSettings />
        </Form.Item>
      </div>

      <div className={s.settingItem}>
        <Form.Item label="Team chain context">
          <Input.TextArea
            rows={2}
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder='{"network":"testnet","contracts":[]}'
          />
        </Form.Item>
        <Button
          size="small"
          disabled={!activeProject?.path}
          onClick={async () => {
            if (!activeProject?.path) return;
            let parsed = { notes: shareNote };
            try {
              parsed = JSON.parse(shareNote);
            } catch {
              /* notes only */
            }
            await writeSharedContext(activeProject.path, parsed);
            const shareId = activeProject.path.replace(/^\/projects\//, '');
            setShareUrl(buildShareImportUrl(shareId));
          }}
        >
          Save shared context
        </Button>
        {shareUrl && (
          <p className={s.description} style={{ wordBreak: 'break-all' }}>
            Share: {shareUrl}
          </p>
        )}
      </div>
    </>
  );
};

export default AppSetting;
