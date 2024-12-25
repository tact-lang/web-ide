import AppIcon from '@/components/ui/icon';
import { useProject } from '@/hooks/projectV2.hooks';
import { getConfigValue, setConfigValue } from '@/utility/git';
import { delay } from '@/utility/utils';
import { Button, Form, Input } from 'antd';
import { FC, useEffect, useState } from 'react';
import s from './GitSetting.module.scss';

interface ISettings {
  username: string;
  email: string;
  token: string;
}

const GitSetting: FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [form] = Form.useForm();

  const { activeProject } = useProject();
  const activeProjectPath = activeProject?.path ?? '';

  const onFormFinish = async (values: ISettings) => {
    setIsLoading(true);
    const { username, email } = values;
    try {
      await setConfigValue('user.name', username, activeProjectPath);
      await delay(500);
      setConfigValue('user.email', email, activeProjectPath);

      localStorage.setItem('gitConfig', JSON.stringify(values));
      // dummy delay to show loading
      await delay(500);
    } catch (error) {
      console.error('Error saving Git settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const gitConfig = JSON.parse(localStorage.getItem('gitConfig') ?? '{}');

      const [username, email, token] = await Promise.all([
        getConfigValue('user.name', 'username', activeProjectPath),
        getConfigValue('user.email', 'email', activeProjectPath),
        gitConfig.token ?? '',
      ]);
      form.setFieldsValue({ username, email, token });
      setIsLoading(false);
    })();
  }, []);

  if (!activeProjectPath) return <></>;

  return (
    <div className={s.root}>
      <Form
        className={`${s.form} app-form`}
        layout="vertical"
        onFinish={onFormFinish}
        requiredMark="optional"
        form={form}
      >
        <Form.Item
          name="username"
          rules={[{ required: true }]}
          className={s.formItem}
        >
          <Input placeholder="Username, e.g., John Doe" />
        </Form.Item>
        <Form.Item
          name="email"
          rules={[{ required: true, type: 'email' }]}
          className={s.formItem}
        >
          <Input placeholder="Email" />
        </Form.Item>
        <Form.Item
          name="token"
          rules={[{ required: true }]}
          className={s.formItem}
          extra={
            <>
              Guide to create a personal access token:{' '}
              <a
                href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Documentation
              </a>
            </>
          }
        >
          <Input.Password placeholder="Git Personal Access Token" />
        </Form.Item>
        <Button
          type="primary"
          className={`item-center-align w-100`}
          htmlType="submit"
          loading={isLoading}
        >
          <AppIcon name="Save" /> Save
        </Button>
      </Form>
    </div>
  );
};

export default GitSetting;
