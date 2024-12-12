import { Tooltip } from '@/components/ui';
import AppIcon, { AppIconType } from '@/components/ui/icon';
import { useCodeImport } from '@/hooks/codeImport.hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import {
  ContractLanguage,
  ProjectTemplate,
  Tree,
} from '@/interfaces/workspace.interface';
import { Analytics } from '@/utility/analytics';
import { downloadRepo } from '@/utility/gitRepoDownloader';
import { App, Button, Form, Input, Modal, Radio, Upload } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import type { RcFile } from 'antd/lib/upload';
import { useRouter } from 'next/router';
import { FC, useCallback, useEffect, useState } from 'react';
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

interface RouterParams {
  importURL?: string;
  name?: string;
  lang?: ContractLanguage;
  code?: string;
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
  const { createProject, projects } = useProject();
  const [isLoading, setIsLoading] = useState(false);
  const { createLog } = useLogActivity();
  const [newProjectType, setNewProjectType] = useState(projectType);
  const { importEncodedCode, removeImportParams } = useCodeImport();
  const { message } = App.useApp();

  const router = useRouter();

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

      if (newProjectType === 'git') {
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
        sourceType: newProjectType,
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

  const onRouterReady = useCallback(async () => {
    const {
      importURL,
      name: projectName,
      lang: importLanguage,
      code: codeToImport,
    } = router.query as RouterParams;
    if (codeToImport) {
      // Default to 'func' as the language if none is provided in the query parameters.
      // This ensures backward compatibility for cases where the language was not included in the query params initially.
      try {
        await importEncodedCode(codeToImport, importLanguage ?? 'func');
      } catch (error) {
        if (error instanceof Error) {
          createLog(error.message, 'error');
          return;
        }
        createLog('Error in importing code', 'error');
      }
      return;
    }

    // When the IDE starts without any projects and no import URL is provided,
    // or if projects already exist but the import URL is missing or the modal is inactive,
    // skip setting up the New Project dialog for import.
    if (
      (projects.length == 0 && !importURL && !active) ||
      (projects.length !== 0 && (!importURL || !active))
    ) {
      return;
    }

    // If there are no projects but an import URL is provided, set the project type to git
    if (projects.length === 0 && importURL) {
      setNewProjectType('git');
    }

    form.setFieldsValue({
      template: 'import',
      githubUrl: importURL ?? '',
      name: projectName ?? '',
      language: importLanguage ?? 'func',
    });
    setIsActive(true);
    await removeImportParams();
  }, [router.isReady, form]);

  useEffect(() => {
    if (!router.isReady) return;
    onRouterReady();
  }, [router.isReady, onRouterReady]);

  const closeModal = () => {
    setIsActive(false);
  };

  return (
    <>
      <Tooltip title={heading} placement="bottom">
        <div
          className={`${s.root} ${className} onboarding-new-project`}
          onClick={() => {
            if (newProjectType !== 'exampleTemplate') {
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

          {newProjectType === 'default' && (
            <Form.Item
              label="Select Template"
              name="template"
              className={`${s.formItem} ${s.optionSelection} template-selector`}
            >
              <Radio.Group options={templatedList} optionType="button" />
            </Form.Item>
          )}

          {newProjectType === 'local' && (
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

          {newProjectType === 'git' && (
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
