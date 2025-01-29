import { useProject } from '@/hooks/projectV2.hooks';
import { Tree } from '@/interfaces/workspace.interface';
import { normalizeRelativePath } from '@/utility/path';
import { Button, Form, Input, Select } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { FC } from 'react';
import s from './TonContractVerifier.module.scss';

const TonContractVerifier: FC = () => {
  const { projectFiles, activeProject } = useProject();

  const [form] = useForm();

  const fileList = projectFiles.filter((file: Tree | null) => {
    if (!file?.path || !activeProject?.path) return false;

    const relativeFilePath = normalizeRelativePath(
      file.path,
      activeProject.path,
    );
    if (relativeFilePath.startsWith('dist/') || file.name === 'stdlib.fc')
      return false;

    return file.path.endsWith('.tact') || file.path.endsWith('.fc');
  });

  return (
    <div className={s.root}>
      <h3 className={`section-heading`}>Contract Verifier</h3>
      <Form form={form} className={`${s.form} app-form`} layout="vertical">
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
          name="contractAddress"
          rules={[
            { required: true, message: 'Please enter the contract address' },
          ]}
          label="Contract Address"
        >
          <Input placeholder="Enter contract address" />
        </Form.Item>

        <Form.Item shouldUpdate>
          {({ getFieldsValue }) => {
            const { contractFile, contractAddress } = getFieldsValue();

            return (
              <Button
                type="primary"
                className={`${s.action} ant-btn-primary-gradient w-100`}
                htmlType="submit"
                disabled={!contractFile || !contractAddress}
              >
                Verify
              </Button>
            );
          }}
        </Form.Item>
      </Form>
    </div>
  );
};

export default TonContractVerifier;
