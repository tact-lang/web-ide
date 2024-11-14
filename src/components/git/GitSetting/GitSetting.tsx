import AppIcon from '@/components/ui/icon';
import { useProject } from '@/hooks/projectV2.hooks';
import GitManager from '@/lib/git';
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
  const git = new GitManager();
  const [isLoading, setIsLoading] = useState(false);

  const [form] = Form.useForm();

  const { activeProject } = useProject();
  const activeProjectPath = activeProject?.path ?? '';
  const gitConfig = JSON.parse(localStorage.getItem('gitConfig') ?? '{}');

  const setConfigValue = async (key: string, value: string) => {
    await git.setConfig({
      path: key,
      dest: activeProjectPath,
      value: value,
    });
  };

  const getConfigValue = async (key: string): Promise<string | null> => {
    // Check Git configuration first, then fallback to localStorage if not found
    const gitValue = await git.getConfig({
      path: `user.${key}`,
      dest: activeProjectPath,
    });
    return gitValue ?? gitConfig[key] ?? null;
  };

  const onFormFinish = async (values: ISettings) => {
    setIsLoading(true);
    const { username, email } = values;
    await Promise.all([
      setConfigValue('user.name', username),
      setConfigValue('user.email', email),
    ]);

    localStorage.setItem('gitConfig', JSON.stringify(values));
    // dummy delay to show loading
    await delay(500);
    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const gitConfig = JSON.parse(localStorage.getItem('gitConfig') ?? '{}');

      const [username, email, token] = await Promise.all([
        getConfigValue('name'),
        getConfigValue('email'),
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
          <Input placeholder="Git Personal Access Token" />
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
