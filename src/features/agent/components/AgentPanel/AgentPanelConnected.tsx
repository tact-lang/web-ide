import { useFile, useFileTab } from '@/hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProjectActions } from '@/hooks/project.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useSettingAction } from '@/hooks/setting.hooks';
import { useWorkspaceActions } from '@/hooks/workspace.hooks';
import { useWebContainer } from '@/state/WebContainer.context';
import { globalWorkspace } from '@/components/workspace/globalWorkspace';
import { FC } from 'react';
import AgentPanel from './AgentPanel';

interface Props {
  projectPath?: string;
}

const AgentPanelConnected: FC<Props> = ({ projectPath }) => {
  const { activeProject, projectFiles } = useProject();
  const { createLog } = useLogActivity();
  const { compileFuncProgram } = useProjectActions();
  const { compileTsFile } = useWorkspaceActions();
  const { getFile } = useFile();
  const { fileTab } = useFileTab();
  const { webcontainer } = useWebContainer();
  const { isContractDebugEnabled, getSettingStateByKey } = useSettingAction();

  const openFiles = fileTab.items
    .map((t) => t.path)
    .filter((p): p is string => !!p);

  return (
    <AgentPanel
      projectPath={projectPath}
      project={activeProject}
      projectFiles={projectFiles}
      openFiles={openFiles}
      webcontainer={webcontainer}
      sandbox={globalWorkspace.sandboxBlockchain ?? null}
      compileOptions={{
        isExternalMessage: !!getSettingStateByKey('isExternalMessage'),
        isContractDebugEnabled: isContractDebugEnabled(),
      }}
      compileFunc={compileFuncProgram}
      compileTs={async (path, id) => {
        const chunks = await compileTsFile(path, id);
        return chunks.map((c) => ({ code: c.code }));
      }}
      getFile={async (path) => {
        try {
          return (await getFile(path)) as string;
        } catch {
          return undefined;
        }
      }}
      onLog={(msg, level) => { createLog(msg, level ?? 'info'); }}
    />
  );
};

export default AgentPanelConnected;
