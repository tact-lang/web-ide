import AppIcon from '@/components/ui/icon';
import { baseProjectPath, useProject } from '@/hooks/projectV2.hooks';
import fileSystem from '@/lib/fs';
import { App, Button, Form, Input, Modal, Tooltip } from 'antd';
import cloneDeep from 'lodash.clonedeep';
import { FC, useState } from 'react';
import s from './CloneProject.module.scss';

const CloneProject: FC = () => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { activeProject, projectFiles, createProject } = useProject();
  const { message } = App.useApp();

  const storeAsNewProject = async ({ name }: { name: string }) => {
    try {
      setIsSaving(true);

      const files = cloneDeep(projectFiles);
      const finalFiles = [];
      for (const file of files) {
        if (file.path.includes('.ide')) {
          continue;
        }
        if (file.type === 'file') {
          file.content = (await fileSystem.readFile(file.path)) as string;
        }
        file.path = file.path.replace(`${activeProject?.path as string}/`, '');
        finalFiles.push(file);
      }
      if (finalFiles.length === 0) {
        message.error('No files to save');
        return;
      }

      await createProject({
        name: name,
        language: activeProject?.language ?? 'tact',
        template: 'import',
        file: null,
        defaultFiles: finalFiles,
      });
      setIsSaveModalOpen(false);
      fileSystem.clearVirtualFiles();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        return;
      }
      message.error('Failed to save a project');
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeProject || activeProject.path !== `${baseProjectPath}/temp`) {
    return null;
  }

  return (
    <>
      <Tooltip
        title={`The current project is not saved permanently. Click here to save it.`}
      >
        <div
          className={s.root}
          onClick={() => {
            setIsSaveModalOpen(true);
          }}
        >
          <AppIcon className={s.saveIcon} name="Save" />
        </div>
      </Tooltip>
      <Modal
        className={s.modal}
        open={isSaveModalOpen}
        onCancel={() => {
          setIsSaveModalOpen(false);
        }}
        footer={null}
      >
        <Form
          className={`${s.form} app-form`}
          layout="vertical"
          onFinish={storeAsNewProject}
        >
          <Form.Item
            name="name"
            rules={[
              { required: true, message: 'Please enter the project name' },
            ]}
          >
            <Input placeholder="Project name" />
          </Form.Item>

          <Form.Item>
            <Button
              className={`${s.btnAction} w-100 ant-btn-primary-gradient item-center-align`}
              loading={isSaving}
              type="primary"
              htmlType="submit"
            >
              <AppIcon name="Save" /> Save
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CloneProject;
