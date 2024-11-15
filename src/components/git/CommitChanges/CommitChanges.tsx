import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import GitManager from '@/lib/git';
import { getConfigValue } from '@/utility/git';
import { Button, Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { FC, useState } from 'react';
import s from './CommitChanges.module.scss';

interface Props {
  onCommit: (message: string) => void;
}

const CommitChanges: FC<Props> = ({ onCommit }) => {
  const [form] = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { activeProject } = useProject();
  const git = new GitManager();
  const { createLog } = useLogActivity();

  const commit = async ({ message }: { message: string }) => {
    if (!activeProject?.path) return;
    const [username, email] = await Promise.all([
      getConfigValue('user.name', 'username', activeProject.path),
      getConfigValue('user.email', 'email', activeProject.path),
    ]);

    if (!username || !email) {
      createLog('Please set username and email in git setting', 'error');
      return;
    }

    try {
      setIsLoading(true);

      await git.commit(message, activeProject.path, {
        name: username,
        email: email,
      });

      onCommit(message);
    } catch (error) {
      if (error instanceof Error) {
        createLog(error.message, 'error');
        return;
      }
      createLog('Failed to commit changes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={s.root}>
      <Form
        form={form}
        className={`${s.form} app-form`}
        layout="vertical"
        onFinish={commit}
        autoComplete="off"
        requiredMark="optional"
      >
        <Form.Item name="message" className={s.formItem}>
          <Input placeholder="commit message" />
        </Form.Item>

        <Button
          className={`w-100 item-center-align`}
          loading={isLoading}
          type="primary"
          htmlType="submit"
        >
          Commit
        </Button>
      </Form>
    </div>
  );
};

export default CommitChanges;
