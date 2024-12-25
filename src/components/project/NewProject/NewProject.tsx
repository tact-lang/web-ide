import { Tooltip } from '@/components/ui';
import AppIcon, { AppIconType } from '@/components/ui/icon';
import { useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { baseProjectPath, useProject } from '@/hooks/projectV2.hooks';
import {
  ContractLanguage,
  ProjectTemplate,
  Tree,
} from '@/interfaces/workspace.interface';
import { Analytics } from '@/utility/analytics';
import EventEmitter from '@/utility/eventEmitter';
import { downloadRepo } from '@/utility/gitRepoDownloader';
import { decodeBase64 } from '@/utility/utils';
import { Button, Form, Input, Modal, Radio, Upload, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import type { RcFile } from 'antd/lib/upload';
import { useRouter } from 'next/router';
import { FC, useEffect, useState } from 'react';
import s from './NewProject.module.scss';

interface Props {
  className?: string;
  ui?: 'icon' | 'button';
  projectType?: 'default' | 'local' | 'git' | 'exampleTemplate';
  label?: string;
  icon?: AppIconType;
  heading?: string;
  active?: boolean;
  defaultFiles?: Tree[];
  projectLanguage?: ContractLanguage;
  name?: string;
}

const NewProject: FC<Props> = ({
  className = '',
  ui = 'icon',
  projectType = 'default',
  label = 'Create',
  icon = 'Plus',
  heading = 'New Project',
  active = false,
  defaultFiles = [],
  projectLanguage = 'func',
  name,
}) => {
  const [isActive, setIsActive] = useState(active);
  const { createProject } = useProject();
  const [isLoading, setIsLoading] = useState(false);
  const { createLog } = useLogActivity();
  const { open: openTab } = useFileTab();

  const router = useRouter();
  const {
    importURL,
    name: projectName,
    lang: importLanguage,
    code: codeToImport,
  } = router.query as {
    importURL?: string;
    name?: string;
    lang?: ContractLanguage;
    code?: string;
  };

  const [form] = useForm();

  const language = [
    { label: 'Tact', value: 'tact', default: true },
    { label: 'Func', value: 'func' },
  ];

  const templatedList = [
    { label: 'Blank Contract', value: 'tonBlank' },
    { label: 'Counter Contract', value: 'tonCounter' },
  ];

  interface FormValues {
    name: string;
    githubUrl?: string;
    language: ContractLanguage;
    template?: ProjectTemplate | 'import';
    file?: { file: RcFile } | null;
  }

  const onFormFinish = async (values: FormValues) => {
    const { githubUrl, language } = values;
    const { name: projectName } = values;
    let files: Tree[] = defaultFiles;

    try {
      setIsLoading(true);

      if (projectType === 'git') {
        files = await downloadRepo(githubUrl as string);
      }

      await createProject({
        name: projectName,
        language,
        template: values.template ?? 'import',
        file: values.file?.file ?? null,
        defaultFiles: files,
      });

      form.resetFields();
      closeModal();
      Analytics.track('Create project', {
        platform: 'IDE',
        type: `TON - ${language}`,
        sourceType: projectType,
        template: values.template,
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      message.success(`Project '${projectName}' created`);
    } catch (error) {
      let errorMessage = 'Error in creating project';
      if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = (error as Error).message || errorMessage;
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      message.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const importFromCode = async (code: string) => {
    try {
      const defaultFileName = `main.${importLanguage}`;
      if (!importLanguage || !['tact', 'func'].includes(importLanguage)) {
        createLog(`Invalid language: ${importLanguage}`, 'error');
        return;
      }
      await createProject({
        name: 'temp',
        language: importLanguage,
        template: 'import',
        file: null,
        defaultFiles: [
          {
            id: '',
            parent: null,
            path: defaultFileName,
            type: 'file' as const,
            name: defaultFileName,
            content: decodeBase64(code),
          },
        ],
        isTemporary: true,
      });
      const finalQueryParam = router.query;
      delete finalQueryParam.code;
      delete finalQueryParam.lang;
      router.replace({ query: finalQueryParam }).catch(() => {});
      openTab(defaultFileName, `${baseProjectPath}/temp/${defaultFileName}`);
    } catch (error) {
      if (error instanceof Error) {
        createLog(error.message, 'error');
        return;
      }
    }
  };

  useEffect(() => {
    if (codeToImport) {
      importFromCode(codeToImport as string);
      return;
    }

    if (!importURL || !active) {
      return;
    }

    form.setFieldsValue({
      template: 'import',
      githubUrl: importURL || '',
      name: projectName ?? '',
      language: importLanguage ?? 'func',
    });
    setIsActive(true);
    const finalQueryParam = router.query;
    delete finalQueryParam.importURL;
    delete finalQueryParam.name;
    router.replace({ query: finalQueryParam }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importURL, projectName, form, codeToImport]);

  const closeModal = () => {
    setIsActive(false);
  };

  useEffect(() => {
    EventEmitter.on('ONBOARDING_NEW_PROJECT', () => {
      setIsActive(true);
    });
    return () => {
      EventEmitter.off('ONBOARDING_NEW_PROJECT');
    };
  }, []);

  return (
    <>
      <Tooltip title={heading} placement="bottom">
        <div
          className={`${s.root} ${className} onboarding-new-project`}
          onClick={() => {
            if (projectType !== 'exampleTemplate') {
              setIsActive(true);
              return;
            }
            onFormFinish({
              template: 'import',
              name: name ?? '',
              language: projectLanguage,
            }).catch(() => {});
          }}
        >
          {ui === 'icon' && <AppIcon name={icon} className={s.newIcon} />}
          {ui === 'button' && (
            <Button
              type="primary"
              className={`ant-btn-primary-gradient item-center-align w-100`}
            >
              <AppIcon name={icon} className={s.newIcon} />{' '}
              {label !== 'Create' ? label : 'Create a new project'}
            </Button>
          )}
        </div>
      </Tooltip>

      <Modal
        className="onboarding-new-project-form"
        open={isActive}
        onCancel={closeModal}
        footer={null}
      >
        <span className={s.title}>{heading}</span>
        <Form
          form={form}
          className={`${s.form} app-form`}
          layout="vertical"
          onFinish={(formValues: FormValues) => {
            onFormFinish(formValues).catch(() => {});
          }}
          autoComplete="off"
          initialValues={{ template: 'tonCounter', language: 'tact' }}
          requiredMark="optional"
        >
          <div className="top-header">
            <Form.Item
              name="name"
              className={s.formItem}
              rules={[
                { required: true, message: 'Please input your project name!' },
              ]}
            >
              <Input placeholder="Project name" />
            </Form.Item>

            <Form.Item
              label="Language"
              name="language"
              className={`${s.formItem} ${s.optionSelection}`}
              rules={[{ required: true }]}
            >
              <Radio.Group options={language} optionType="button" />
            </Form.Item>
          </div>

          {projectType === 'default' && (
            <Form.Item
              label="Select Template"
              name="template"
              className={`${s.formItem} ${s.optionSelection} template-selector`}
            >
              <Radio.Group options={templatedList} optionType="button" />
            </Form.Item>
          )}

          {projectType === 'local' && (
            <Form.Item
              label="Select contract zip file"
              name="file"
              className={s.formItem}
              rules={[{ required: true }]}
            >
              <Upload.Dragger
                accept=".zip"
                multiple={false}
                maxCount={1}
                beforeUpload={() => {
                  return false;
                }}
              >
                <div className={s.fileUploadLabel}>
                  <AppIcon name="Download" className={s.icon} />
                  <b>Choose a .zip file</b> <span>or drag it here</span>
                </div>
              </Upload.Dragger>
            </Form.Item>
          )}

          {projectType === 'git' && (
            <Form.Item
              label="Github Repository URL"
              name="githubUrl"
              className={s.formItem}
              rules={[
                {
                  required: true,
                  message: 'Please input your Github Repository URL',
                },
              ]}
            >
              <Input placeholder="Ex. https://github.com/tact-lang/tact-template" />
            </Form.Item>
          )}

          <Form.Item className={s.btnActionContainer}>
            <Button
              className={`${s.btnAction} ant-btn-primary-gradient item-center-align`}
              loading={isLoading}
              type="primary"
              htmlType="submit"
            >
              <AppIcon name={icon} /> {label}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NewProject;
