import {
  CloneProject,
  DownloadProject,
  MigrateToUnifiedFS,
  NewProject,
} from '@/components/project';
import { Tooltip } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { baseProjectPath, useProject } from '@/hooks/projectV2.hooks';
import { Project } from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { getUrlParams } from '@/utility/url';
import { App, Button, Modal, Select } from 'antd';
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import s from './ManageProject.module.scss';

const ManageProject: FC = () => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { message } = App.useApp();
  const [importURL, setImportURL] = useState<string | null>(null);

  const navigate = useNavigate();

  const {
    projects,
    setActiveProject,
    deleteProject,
    activeProject,
    loadProjects,
  } = useProject();

  const deleteSelectedProject = async (id: Project['id']) => {
    try {
      await deleteProject(id);
      setActiveProject(null);
      setIsDeleteConfirmOpen(false);
      navigate('/');
    } catch (error) {
      await message.error('Failed to delete project');
    }
  };

  const openProject = async (selectedProject: Project['id']) => {
    if (!selectedProject) {
      await message.error('Project not found');
      return;
    }
    EventEmitter.emit('OPEN_PROJECT', `${baseProjectPath}/${selectedProject}`);
  };

  const projectHeader = () => (
    <>
      <span className={s.heading}>Projects</span>
      <div className={s.options}>
        <CloneProject />
        <NewProject />
        <NewProject
          label="Import"
          projectType="git"
          heading="Import from GitHub"
          icon="GitHub"
          className={s.git}
          active={importURL !== null}
          key={importURL ?? 'import-from-git'}
        />
        <NewProject
          label="Import"
          projectType="local"
          heading="Import from local"
          icon="Import"
          className={s.local}
        />

        <Tooltip title="Delete Project" placement="bottom">
          <div
            className={`${s.deleteProject} ${!activeProject ? s.disabled : ''}`}
            onClick={() => {
              if (!activeProject) return;
              setIsDeleteConfirmOpen(true);
            }}
          >
            <AppIcon name="Delete" />
          </div>
        </Tooltip>
        {projects.length > 0 && (
          <DownloadProject path="/" title="Download all projects" />
        )}
      </div>
    </>
  );

  const projectOptions = () => (
    <div className={s.projects}>
      <Select
        placeholder="Select a project"
        showSearch
        className="w-100 select-search-input-dark"
        value={activeProject?.name}
        onChange={(_project) => {
          openProject(_project).catch(() => {});
        }}
        notFoundContent="No project found"
        filterOption={(inputValue, option) => {
          return (
            option?.title?.toLowerCase().includes(inputValue.toLowerCase()) ??
            false
          );
        }}
      >
        {[...projects].reverse().map((project) => (
          <Select.Option key={project} value={project} title={project}>
            {project}
          </Select.Option>
        ))}
      </Select>
    </div>
  );

  const noProjectExistsUI = () => (
    <div className={s.header}>
      <div className={s.startNew}>
        <span className={s.title}>
          Get started by creating your first project.
        </span>
        <NewProject ui="button" className={s.newProject} icon="Plus" />
        <MigrateToUnifiedFS hasDescription />
      </div>
    </div>
  );

  useEffect(() => {
    loadProjects();
    setImportURL(getUrlParams().get('importURL'));
  }, []);

  return (
    <div className={s.root}>
      <div className={s.header}>{projectHeader()}</div>

      {projects.length > 0 ? projectOptions() : noProjectExistsUI()}

      <Modal
        className="modal-delete-project"
        open={isDeleteConfirmOpen}
        closable={false}
        footer={null}
      >
        <span className={s.modalTitle}>
          <AppIcon name="Info" /> Delete my <b>`{activeProject?.name}`</b>{' '}
          Project?
        </span>
        <div className={s.modalDescription}>
          <p>
            <b>Are you sure you want to delete?</b>
          </p>
          <div className={s.checklist}>
            <span>- This action is irreversable!</span>
            <span>- All files and folders will be deleted.</span>
          </div>
        </div>
        <div className={s.actions}>
          <Button
            className={`${s.btnAction} ${s.cancel}`}
            type="primary"
            onClick={() => {
              setIsDeleteConfirmOpen(false);
            }}
          >
            <AppIcon name="Close" className={s.icon} />
            Cancel
          </Button>
          <Button
            className={s.btnAction}
            type="primary"
            danger
            onClick={() => {
              if (activeProject?.path) {
                deleteSelectedProject(activeProject.path).catch(() => {});
              }
            }}
          >
            <AppIcon name="Delete" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ManageProject;
