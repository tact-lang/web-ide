import { SettingInterface } from '@/interfaces/setting.interface';
import { ProjectSetting, Tree } from '@/interfaces/workspace.interface';
import { FC, createContext, useEffect, useMemo, useState } from 'react';

interface ITabItems {
  name: string;
  path: string;
  isDirty: boolean;
}

export interface IFileTab {
  items: ITabItems[];
  active: string | null;
}

interface IDEContextProps {
  projects: string[];
  setProjects: (projects: string[]) => void;
  projectFiles: Tree[];
  setProjectFiles: (files: Tree[]) => void;
  activeProject: ProjectSetting | null;
  setActiveProject: (project: ProjectSetting | null) => void;
  fileTab: IFileTab;
  setFileTab: (fileTab: IFileTab) => void;
  setting: SettingInterface;
  setSetting: (setting: SettingInterface) => void;
}

const defaultSetting = {
  contractDebug: true,
  formatOnSave: false,
  tonAmountForInteraction: '0.05',
  autoBuildAndDeploy: true,
  editorMode: 'default' as const,
  isExternalMessage: false,
  theme: 'dark' as const,
};

const defaultState = {
  projects: [],
  projectFiles: [],
  setProjectFiles: () => {},
  setProjects: () => {},
  activeProject: null,
  setActiveProject: () => {},
  fileTab: {
    items: [],
    active: null,
  },
  setFileTab: () => {},
  setting: defaultSetting,
  setSetting: () => {},
};

export const IDEContext = createContext<IDEContextProps>(defaultState);

export const IDEProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [projects, setProjects] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<Tree[]>([]);
  const [fileTab, setFileTab] = useState<IFileTab>(defaultState.fileTab);
  const [activeProject, setActiveProject] = useState<ProjectSetting | null>(
    null,
  );
  const [setting, setSetting] = useState<SettingInterface>(defaultSetting);
  const [isLoaded, setIsLoaded] = useState(false);

  const value = useMemo(
    () => ({
      projects,
      setProjects,
      projectFiles,
      setProjectFiles,
      activeProject,
      setActiveProject,
      fileTab,
      setFileTab,
      setting,
      setSetting,
    }),
    [activeProject, projects, projectFiles, fileTab, setting],
  );

  const onInit = () => {
    const storedActiveProject = localStorage.getItem('IDE_activeProject');
    if (storedActiveProject) {
      setActiveProject(JSON.parse(storedActiveProject));
    }
  };

  useEffect(() => {
    onInit();
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(
      'IDE_activeProject',
      JSON.stringify(activeProject ?? {}),
    );
  }, [activeProject]);

  return <IDEContext.Provider value={value}>{children}</IDEContext.Provider>;
};
