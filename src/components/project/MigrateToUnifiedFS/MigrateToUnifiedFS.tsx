import AppIcon from '@/components/ui/icon';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import {
  ContractLanguage,
  Project,
  Tree,
} from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import { App, Button, ConfigProvider, Modal, Popconfirm } from 'antd';
import { FC, useEffect, useState } from 'react';
import { IndexedDBHelper } from './IndexedDBHelper';
import s from './MigrateToUnifiedFS.module.scss';

interface Props {
  hasDescription?: boolean;
}

interface DBFile {
  id: string;
  content: string;
}

interface IProject {
  projectDetails: Project;
  files: Tree[];
}

const MigrateToUnifiedFS: FC<Props> = ({ hasDescription = false }) => {
  const [isMigrationView, setIsMigrationView] = useState(false);
  const fileSystem = new IndexedDBHelper('NujanFiles', 'files', 10);
  const [projects, setProjects] = useState<IProject[] | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<
    'pending' | 'migrating' | 'failed' | 'completed' | 'done'
  >('pending');
  const { createProject } = useProject();
  const { createLog } = useLogActivity();
  const { message } = App.useApp();

  const note = `We've recently upgraded the IDE, and some of your projects may not be visible.`;

  const checkMigration = async () => {
    const localStorageItems = localStorage.getItem('recoil-persist');
    if (localStorageItems) {
      const filesInDB = (await fileSystem.getAllFiles()) as DBFile[];
      const parsedItems = JSON.parse(localStorageItems);
      const existingProjects = parsedItems?.['workspaceState']?.[
        'projects'
      ] as Partial<Project[] | undefined>;
      const projectFiles = parsedItems?.['workspaceState']?.['projectFiles'];
      if (!existingProjects) return;

      const project = existingProjects.map((project) => {
        if (!project) return;
        const { id, ...rest } = project;
        const files = projectFiles?.[id as keyof typeof projectFiles] as Tree[];
        files.forEach((element) => {
          const file = filesInDB.find((file) => file.id === element.id);
          if (file) {
            element.content = file.content;
          }
        });

        return {
          projectDetails: { ...rest },
          files,
        };
      });

      if (Array.isArray(existingProjects) && existingProjects.length > 0) {
        // setHasFileForMigration(true);
        setProjects(project as IProject[]);
      }
    }
  };

  const migrateProject = async () => {
    if (!projects || projects.length === 0) {
      message.error('No project found to migrate');
      return;
    }
    try {
      setMigrationStatus('migrating');
      message.warning('Migrating project...');
      const migratedProjects = [];

      for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        const isLastProject = i === projects.length - 1;

        await createProject({
          name: project.projectDetails.name as string,
          language: project.projectDetails.language as ContractLanguage,
          template: 'import',
          file: null,
          defaultFiles: project.files as Tree[],
          autoActivate: isLastProject,
        });

        migratedProjects.push(project.projectDetails.name);
      }

      message.success('Project migrated successfully');
      localStorage.setItem('migrationStatus', 'completed');
      createLog(
        `Total: ${migratedProjects.length} migrated. \nProjects: ${migratedProjects.toString()}`,
        'success',
      );
      setMigrationStatus('completed');
      EventEmitter.emit('PROJECT_MIGRATED');
    } catch (error) {
      createLog('Failed to migrate project', 'error');
      setMigrationStatus('failed');
    }
  };

  const deleteOldProjects = async () => {
    try {
      localStorage.removeItem('recoil-persist');
      await fileSystem.deleteDatabase();
      localStorage.removeItem('migrationStatus');
      message.success('Old projects deleted successfully');
      setIsMigrationView(false);
      setMigrationStatus('done');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
        return;
      }
      message.error('Failed to delete old projects');
    }
  };

  const onProjectMigrated = () => {
    if (migrationStatus !== 'pending') return;
    setMigrationStatus('completed');
    setIsMigrationView(true);
  };

  useEffect(() => {
    const migrationStatus = localStorage.getItem('migrationStatus');
    if (migrationStatus === 'completed') {
      setMigrationStatus('completed');
    }
    try {
      checkMigration();
    } catch (error) {
      /* empty */
    }
    EventEmitter.on('PROJECT_MIGRATED', onProjectMigrated);
    return () => {
      EventEmitter.off('PROJECT_MIGRATED', onProjectMigrated);
    };
  }, []);

  if (projects === null || migrationStatus === 'done') return null;

  return (
    <>
      <div className={s.root}>
        {hasDescription && (
          <div className={s.description}>
            <span>Note: </span>
            {note} To restore them, simply click the{' '}
            <strong>`Restore Old Projects` </strong> button.
          </div>
        )}
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#faad14',
            },
          }}
        >
          <Button
            type="primary"
            className={`item-center-align w-100 ${s.btnRestore}`}
            onClick={() => {
              setIsMigrationView(true);
            }}
          >
            <AppIcon className={s.icon} name="Reload" /> Restore Old Projects
          </Button>
        </ConfigProvider>
      </div>
      <Modal
        className={`onboarding-new-project-form ${s.modal}`}
        open={isMigrationView}
        onCancel={() => {
          setIsMigrationView(false);
        }}
        footer={null}
      >
        <div className={s.description}>
          <p>
            <strong>Note: </strong>
            {note}
          </p>
          <p>
            Migrating your project to the new file system ensures better
            compatibility and performance with upcoming updates. All your
            project files preserved during the migration.
          </p>

          <p>
            <strong>Projects({projects.length}): </strong>
            {projects.map((project, index) => (
              <span key={project.projectDetails.name}>
                {project.projectDetails.name}
                {index !== projects.length - 1 && ', '}
              </span>
            ))}
          </p>
        </div>

        <Button
          type="primary"
          // danger
          className={`item-center-align w-100`}
          loading={migrationStatus === 'migrating'}
          onClick={() => {
            migrateProject();
          }}
        >
          <AppIcon name="Reload" /> Restore
        </Button>

        {migrationStatus === 'completed' && (
          <>
            <p className={s.successMessage}>
              Migration completed successfully. Now you can safely delete old
              project from archive.
            </p>
            <Popconfirm
              title="Delete archive projects"
              description="Are you sure to delete?"
              onConfirm={deleteOldProjects}
              onCancel={() => {}}
              okText="Yes"
              cancelText="No"
            >
              <Button
                type="primary"
                danger
                className={`item-center-align w-100`}
              >
                <AppIcon name="Delete" /> Delete Old Projects
              </Button>
            </Popconfirm>
          </>
        )}
      </Modal>
    </>
  );
};

export default MigrateToUnifiedFS;
