import AppIcon from '@/components/ui/icon';
import { useProject } from '@/hooks/projectV2.hooks';
import GitManager from '@/lib/git';
import { delay } from '@/utility/utils';
import { Button, Form, Input } from 'antd';
import { FC, useEffect, useState } from 'react';
import s from './GitRemote.module.scss';

const GitRemote: FC = () => {
  const git = new GitManager();

  const [isLoading, setIsLoading] = useState(false);

  const [form] = Form.useForm();

  const { activeProject } = useProject();
  const activeProjectPath = activeProject?.path ?? '';

  const addRemote = async ({ url }: { url: string }) => {
    try {
      setIsLoading(true);
      if (!url) {
        await git.removeRemote(activeProjectPath);
        return;
      }
      await git.addRemote(url, activeProjectPath);
    } catch (error) {
      console.error(error);
    } finally {
      await delay(500);
      setIsLoading(false);
    }
  };

  const getRemote = async () => {
    try {
      setIsLoading(true);
      const remote = await git.getRemote(activeProjectPath);
      let url = '';
      if (remote.length !== 0) {
        url = remote[0].url;
      }
      form.setFieldsValue({ url });
    } catch (error) {
      console.error(error);
    } finally {
      await delay(500);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getRemote();
  }, []);

  return (
    <div className={s.root}>
      <Form
        className={`${s.form} app-form`}
        layout="vertical"
        onFinish={addRemote}
        requiredMark="optional"
        form={form}
      >
        <Form.Item name="url" className={s.formItem}>
          <Input placeholder="GitHub repository URL" />
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

export default GitRemote;
