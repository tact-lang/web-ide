import {
  ProjectTemplate as ProjectTemplateData,
  commonProjectFiles,
} from '@/constant/ProjectTemplate';
import {
  ABIFormInputValues,
  ContractLanguage,
  CreateProjectParams,
  ProjectSetting,
  Tree,
} from '@/interfaces/workspace.interface';
import fileSystem from '@/lib/fs';
import ZIP from '@/lib/zip';
import EventEmitter from '@/utility/eventEmitter';
import { RcFile } from 'antd/es/upload';
import cloneDeep from 'lodash.clonedeep';
import { useContext } from 'react';
import { IDEContext } from '../state/IDE.context';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  parent?: string;
  content?: string;
}

export const baseProjectPath = '/projects';

export const useProject = () => {
  const {
    projects,
    setProjects,
    activeProject,
    setActiveProject,
    projectFiles,
    setProjectFiles,
    setFileTab,
  } = useContext(IDEContext);

  const loadProjects = async () => {
    let projectCollection: string[] = [];
    try {
      projectCollection = await fileSystem.readdir(baseProjectPath, {
        onlyDir: true,
      });

      // remove base path from project path
      projectCollection = projectCollection.map((project) => {
        return project.replace(baseProjectPath, '');
      });
    } catch (error) {
      try {
        await fileSystem.create(baseProjectPath, 'directory');
      } catch (error) {
        /* empty */
      }
    } finally {
      setProjects([...projectCollection]);
    }
  };

  const createProject = async ({
    name,
    language,
    template,
    file,
    defaultFiles,
    autoActivate = true,
    isTemporary = false,
  }: CreateProjectParams) => {
    let projectDirectory = `${baseProjectPath}/${name}`;
    try {
      projectDirectory = (await fileSystem.mkdir(`${baseProjectPath}/${name}`, {
        overwrite: isTemporary,
      })) as string;
    } catch (error) {
      /* empty */
    }
    if (!name || !projectDirectory) return;

    let files =
      template === 'import' && defaultFiles?.length == 0
        ? await new ZIP(fileSystem).importZip(file as RcFile, projectDirectory)
        : createTemplateBasedProject(
            template,
            language,
            defaultFiles,
            projectDirectory,
          );

    const fileMapping: Record<string, Partial<Tree> | undefined> = files.reduce(
      (acc, current) => {
        acc[current.path] = current;
        return acc;
      },
      {} as Record<string, Partial<Tree>>,
    );

    if (
      (!fileMapping[`${projectDirectory}/stateInit.cell.ts`] ||
        !fileMapping[`${projectDirectory}/message.cell.ts`]) &&
      language === 'func'
    ) {
      const commonFiles = createTemplateBasedProject(
        'import',
        language,
        commonProjectFiles,
        projectDirectory,
      );
      files = [...files, ...commonFiles];
    }

    const project = {
      name: projectDirectory.replace(baseProjectPath + '/', ''),
      language,
      template,
    };

    await writeFiles(projectDirectory, files, { isTemporary });

    const projectSettingPath = `${projectDirectory}/.ide/setting.json`;
    if (!(await fileSystem.exists(projectSettingPath))) {
      await fileSystem.writeFile(
        projectSettingPath,
        JSON.stringify({ ...project }),
      );
    }
    await loadProjects();

    if (autoActivate) {
      setActiveProject({
        path: projectDirectory,
        ...project,
      });
    }

    return projectDirectory;
  };

  const writeFiles = async (
    projectPath: string,
    files: Pick<Tree, 'type' | 'path' | 'content'>[],
    options?: { overwrite?: boolean; isTemporary?: boolean },
  ) => {
    await Promise.all(
      files.map(async (file) => {
        if (file.type === 'directory') {
          return fileSystem.mkdir(file.path);
        }
        await fileSystem.writeFile(file.path, file.content ?? '', {
          ...options,
          virtual: options?.isTemporary ?? false,
          overwrite: options?.isTemporary ? true : options?.overwrite,
        });
        EventEmitter.emit('FORCE_UPDATE_FILE', file.path);
        return file.path;
      }),
    );
    EventEmitter.emit('RELOAD_PROJECT_FILES', projectPath);
  };

  const loadProjectFiles = async (projectPath: string) => {
    let projectFiles: FileNode[] = [];
    try {
      projectFiles = await readdirTree(projectPath);
    } catch (error) {
      console.log('Error loading project files', error);
      /* empty */
    } finally {
      setProjectFiles(projectFiles as Tree[]);
    }
  };

  /**
   * Read the contents of a directory in a tree structure
   * @param path
   * @returns FileNode[]
   */
  const readdirTree = async (
    path: string,
    options: { basePath: null | string; content: boolean } = {
      basePath: null,
      content: false,
    },
    filter?: (fileNode: FileNode) => boolean,
  ): Promise<FileNode[]> => {
    const results: FileNode[] = [];
    const basePath = options.basePath ?? path;

    const files = await fileSystem.readdir(path);

    for (const file of files) {
      const filePath = `${path}/${file}`;
      const stat = await fileSystem.stat(filePath);
      const fileNode: FileNode = {
        name: file,
        path: filePath,
        type: stat.isDirectory() ? 'directory' : 'file',
        parent: path === basePath ? undefined : path,
        content: options.content
          ? ((await fileSystem.readFile(filePath)) as string)
          : '',
      };

      if (!filter || filter(fileNode)) {
        results.push(fileNode);
      }

      if (stat.isDirectory()) {
        const nestedFiles = await readdirTree(
          filePath,
          {
            basePath,
            content: options.content,
          },
          filter,
        );
        results.push(...nestedFiles);
      }
    }

    return results;
  };

  const deleteProject = async (projectName: string) => {
    await fileSystem.rmdir(projectName, { recursive: true });
    await loadProjects();
    setProjectFiles([]);
    setFileTab({ items: [], active: null });

    return projectName;
  };

  const deleteAllProjects = async () => {
    await fileSystem.rmdir(baseProjectPath, { recursive: true });
    setProjectFiles([]);
    setFileTab({ items: [], active: null });
    setActiveProject(null);
    await loadProjects();
  };

  const newFileFolder = async (path: string, type: 'file' | 'directory') => {
    if (!activeProject?.path) return;
    const newPath = `${activeProject.path}/${path}`;
    await fileSystem.create(newPath, type);
    await loadProjectFiles(activeProject.path);
  };

  const deleteProjectFile = async (path: string) => {
    if (!activeProject?.path) return;
    await fileSystem.remove(path, {
      recursive: true,
    });
    await loadProjectFiles(activeProject.path);
  };

  const moveItem = async (oldPath: string, targetPath: string) => {
    if (!activeProject?.path) return;
    if (oldPath === targetPath) return;

    const newPath = targetPath + '/' + oldPath.split('/').pop();

    await fileSystem.rename(oldPath, newPath);
    await loadProjectFiles(activeProject.path);
  };

  const renameProjectFile = async (oldPath: string, newName: string) => {
    if (!activeProject?.path) return { success: false };
    const newPath = oldPath.includes('/')
      ? oldPath.split('/').slice(0, -1).join('/') + '/' + newName
      : newName;

    const success = await fileSystem.rename(oldPath, newPath);
    if (!success) return { success: false };
    await loadProjectFiles(activeProject.path);
    return { success: true, oldPath, newPath };
  };

  const updateActiveProject = async (
    projectPath: string | null,
    force = false,
  ) => {
    if (activeProject?.path === projectPath && !force) return;
    const projectSettingPath = `${projectPath}/.ide/setting.json`;
    if (projectPath && (await fileSystem.exists(projectSettingPath))) {
      const setting = (await fileSystem.readFile(projectSettingPath)) as string;
      const parsedSetting = setting ? JSON.parse(setting) : {};
      setActiveProject({
        ...parsedSetting,
        path: projectPath,
      });
    } else {
      setActiveProject(null);
    }
  };

  const updateProjectSetting = async (itemToUpdate: ProjectSetting) => {
    if (!activeProject?.path) return;
    const projectSettingPath = `${activeProject.path}/.ide/setting.json`;
    if (!(await fileSystem.exists(projectSettingPath))) {
      await fileSystem.writeFile(projectSettingPath, JSON.stringify({}));
    } else {
      const setting = (await fileSystem.readFile(projectSettingPath)) as string;
      const parsedSetting = setting ? JSON.parse(setting) : {};
      await fileSystem.writeFile(
        projectSettingPath,
        JSON.stringify({ ...parsedSetting, ...itemToUpdate }),
        {
          overwrite: true,
        },
      );
      await updateActiveProject(activeProject.path, true);
    }
    await loadProjectFiles(activeProject.path);
  };

  function updateABIInputValues(inputValues: ABIFormInputValues) {
    if (!activeProject) {
      return;
    }
    const formInputValues = cloneDeep(inputValues);
    const abiFormInputValues =
      cloneDeep(activeProject.abiFormInputValues) ?? [];
    const index = abiFormInputValues.findIndex(
      (item) =>
        item.key === formInputValues.key && item.type === formInputValues.type,
    );
    if (index < 0) {
      abiFormInputValues.push(formInputValues);
    } else {
      abiFormInputValues[index] = formInputValues;
    }
    updateProjectSetting({
      abiFormInputValues,
    });
  }

  function getABIInputValues(key: string, type: string) {
    if (!activeProject) {
      return [];
    }
    return activeProject.abiFormInputValues?.find(
      (item) => item.type === type && item.key === key,
    )?.value;
  }

  return {
    projects,
    projectFiles,
    activeProject,
    createProject,
    writeFiles,
    deleteProject,
    readdirTree,
    newFileFolder,
    deleteProjectFile,
    deleteAllProjects,
    moveItem,
    renameProjectFile,
    setActiveProject: updateActiveProject,
    loadProjectFiles,
    loadProjects,
    updateProjectSetting,
    getABIInputValues,
    updateABIInputValues,
  };
};

const createTemplateBasedProject = (
  template: 'tonBlank' | 'tonCounter' | 'import',
  language: ContractLanguage = 'tact',
  files: Tree[] = [],
  basePath?: string,
) => {
  let _files: Pick<Tree, 'type' | 'path' | 'content'>[] = cloneDeep(files);
  if (files.length === 0 && template !== 'import') {
    _files = ProjectTemplateData[template][language];
  }

  _files = _files.map((file) => {
    return {
      type: file.type,
      path: `${basePath}/${file.path}`,
      content: file.content,
    };
  });
  return _files;
};
