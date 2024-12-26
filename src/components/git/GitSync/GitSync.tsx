import AppIcon from '@/components/ui/icon';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import GitManager from '@/lib/git';
import EventEmitter from '@/utility/eventEmitter';
import { delay } from '@/utility/utils';
import { Button, Form, Switch } from 'antd';
import { FC, useState } from 'react';
import s from './GitSync.module.scss';

const GitSync: FC = () => {
  const git = new GitManager();
  const { createLog } = useLogActivity();
  const { activeProject } = useProject();

  const activeProjectPath = activeProject?.path ?? '';
  const [currentLoading, setCurrentLoading] = useState<'push' | 'pull' | null>(
    null,
  );
  const [forcePush, setForcePush] = useState(false);

  const onMessage = async (message: string) => {
    // add a delay to show the progress counter
    await delay(5);
    createLog(`\x1b[2K\r${message}`, 'info', true, true);
  };

  const preCheck = async () => {
    const remote = await git.getRemote(activeProjectPath);
    if (remote.length === 0) {
      createLog(
        'Remote repository not found. Please add a remote repository first.',
        'error',
        true,
        true,
      );
      return false;
    }
    return true;
  };

  const push = async () => {
    try {
      if (!(await preCheck())) return;
      setCurrentLoading('push');
      const response = await git.push(activeProjectPath, onMessage, forcePush);
      if (response.ok) {
        createLog('Push operation completed successfully.', 'success');
        return;
      }
      createLog(
        'Push operation failed. Please check the Git configuration or network connection.',
        'error',
      );
    } catch (error) {
      if (error instanceof Error) {
        createLog(
          `Push operation encountered an error: ${error.message}`,
          'error',
        );
        return;
      }
      createLog('Push operation failed.', 'error');
    } finally {
      setCurrentLoading(null);
    }
  };

  const pull = async () => {
    if (!(await preCheck())) return;
    try {
      setCurrentLoading('pull');
      await git.pull(activeProjectPath, onMessage);
      EventEmitter.emit('GIT_PULL_FINISHED', activeProjectPath);
      createLog('', 'info', true, true);
    } catch (error) {
      if (error instanceof Error) {
        createLog(
          `Pull operation encountered an error: ${error.message}`,
          'error',
        );
        return;
      }
      createLog('Pull operation failed.', 'error');
    } finally {
      setCurrentLoading(null);
    }
  };

  return (
    <div className={s.root}>
      <div>
        <Form.Item label="Force Push">
          <Switch checked={forcePush} onChange={setForcePush} />
        </Form.Item>
      </div>
      <div className={s.actions}>
        <Button
          type="primary"
          className={`item-center-align w-100`}
          onClick={pull}
          loading={currentLoading === 'pull'}
          disabled={currentLoading !== null}
        >
          <AppIcon name="AngleDown" /> Pull
        </Button>
        <Button
          type="primary"
          className={`item-center-align w-100`}
          onClick={push}
          loading={currentLoading === 'push'}
          disabled={currentLoading !== null}
        >
          <AppIcon name="AngleUp" /> Push
        </Button>
      </div>
    </div>
  );
};

export default GitSync;
