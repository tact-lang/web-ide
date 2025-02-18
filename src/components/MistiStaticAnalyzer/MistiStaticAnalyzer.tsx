import { COLOR_MAP } from '@/constant/ansiCodes';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { Tree } from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import { normalizeRelativePath } from '@/utility/path';
import { mistiFormatResult } from '@/utility/utils';
import Path from '@isomorphic-git/lightning-fs/src/path';
import {
  BuiltInDetectors,
  DEFAULT_STDLIB_PATH_ELEMENTS,
  MISTI_VERSION,
  Severity,
} from '@nowarp/misti/dist';
import { Driver } from '@nowarp/misti/dist/cli/driver';
import { createVirtualFileSystem } from '@nowarp/misti/dist/vfs/createVirtualFileSystem';
import stdLibFiles from '@tact-lang/compiler/dist/imports/stdlib';
import { Button, Form, Select, Switch, TreeSelect } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { FC, useState } from 'react';
import s from './MistiStaticAnalyzer.module.scss';

const severityOptions = Object.keys(Severity)
  .filter((key) => isNaN(Number(key))) // Filter out the numeric reverse mappings
  .map((key) => ({
    label: key,
    value: Severity[key as keyof typeof Severity],
  }));

interface FormValues {
  contractFile: string;
  severity: Severity;
  allDetectors: boolean;
  detectors?: string[];
}

const MistiStaticAnalyzer: FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { projectFiles, activeProject } = useProject();
  const { createLog } = useLogActivity();

  const [form] = useForm();

  const fileList = projectFiles.filter((f: Tree | null) => {
    return f?.path.endsWith('.tact');
  });

  const run = async (formValues: FormValues) => {
    if (!activeProject?.path) return;
    const { contractFile, severity, allDetectors, detectors } = formValues;
    try {
      const vfs = createVirtualFileSystem('/', {}, false);
      setIsAnalyzing(true);

      for (const file of projectFiles) {
        if (!file.path.endsWith('.tact')) {
          continue;
        }
        const content = await fileSystem.readFile(file.path);
        if (content) {
          vfs.writeFile(
            normalizeRelativePath(file.path, activeProject.path),
            content as string,
          );
        }
      }

      // add all stdlib files to vfs
      for (const [path, content] of Object.entries(stdLibFiles)) {
        const stdLibPath = Path.resolve(...DEFAULT_STDLIB_PATH_ELEMENTS, path);
        vfs.writeFile(stdLibPath, content);
      }

      const driver = await Driver.create(
        [normalizeRelativePath(contractFile, activeProject.path)],
        {
          allDetectors,
          fs: vfs,
          enabledDetectors: detectors,
          minSeverity: severity,
          listDetectors: false,
          souffleEnabled: false,
          tactStdlibPath: Path.resolve(...DEFAULT_STDLIB_PATH_ELEMENTS),
          newDetector: undefined,
        },
      );

      const result = await driver.execute();
      const formattedResult = mistiFormatResult(result);
      for (const log of formattedResult) {
        // Replace Misti's default light yellow with a darker yellow to ensure better visibility across both dark and light themes.
        log.message = log.message
          .split('\x1b[33m')
          .join(COLOR_MAP.warning)
          .split('\x1b[0m')
          .join(COLOR_MAP.reset);
        createLog(log.message, log.type);
      }
    } catch (error) {
      if (error instanceof Error) {
        createLog(error.message, 'error');
        return;
      }
      createLog(
        'An unexpected error occurred while analyzing the contract',
        'error',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={s.root}>
      <h3 className={`section-heading`}>Misti - Static Analyzer</h3>

      <p>
        Detect security issues in TON smart contracts before they reach
        production.{' '}
        <a
          href="https://nowarp.io/tools/misti/"
          target="_blank"
          rel="noreferrer"
        >
          Check it out
        </a>
      </p>
      <p>- Misti Version: {MISTI_VERSION.split('-')[0]}</p>

      <Form
        form={form}
        className={`${s.form} app-form`}
        onFinish={run}
        layout="vertical"
        initialValues={{
          severity: Severity.INFO,
          allDetectors: true,
        }}
      >
        <Form.Item
          name="contractFile"
          className={s.formItem}
          rules={[{ required: true }]}
          label="Contract File"
        >
          <Select
            placeholder="Select a contract file"
            notFoundContent="Required file not found"
            allowClear
            showSearch
            className={`w-100`}
            defaultActiveFirstOption
            filterOption={(inputValue, option) => {
              return option?.title
                .toLowerCase()
                .includes(inputValue.toLowerCase());
            }}
          >
            {fileList.map((f) => (
              <Select.Option key={f.path} value={f.path} title={f.path}>
                {f.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          className={s.formItem}
          name="severity"
          label="Minimum Severity Level"
        >
          <Select
            placeholder="Select Minimum Severity Level"
            allowClear
            options={severityOptions}
          />
        </Form.Item>

        <Form.Item
          style={{ marginBottom: '0.5rem' }}
          label="All Detectors"
          valuePropName="checked"
          name="allDetectors"
        >
          <Switch />
        </Form.Item>
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            return (
              !getFieldValue('allDetectors') && (
                <Form.Item name="detectors" className={s.formItem}>
                  <TreeSelect
                    placeholder="Enabled detectors"
                    allowClear
                    treeCheckable={true}
                    treeData={Object.keys(BuiltInDetectors).map((key) => ({
                      label: key,
                      value: key,
                    }))}
                  ></TreeSelect>
                </Form.Item>
              )
            );
          }}
        </Form.Item>
        <Button
          type="primary"
          className={`${s.action} ant-btn-primary-gradient w-100`}
          loading={isAnalyzing}
          htmlType="submit"
        >
          Analyze
        </Button>
      </Form>
      <div className={s.note}>
        <b>Note:</b> Soufflé-related analysis will not work as it cannot run in
        the browser. The following detectors will be disabled:
        <ul>
          <li>DivideBeforeMultiply</li>
          <li>ReadOnlyVariables</li>
          <li>UnboundLoop</li>
        </ul>
      </div>
    </div>
  );
};

export default MistiStaticAnalyzer;
