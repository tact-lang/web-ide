import { Popover } from 'antd';
import { FC, useCallback, useEffect } from 'react';

import AppIcon from '@/components/ui/icon';

import { useNavigate } from 'react-router-dom';
import { AppSetting, SidebarMenu, Socials, ThemeSwitcher } from './index';
import s from './WorkspaceSidebar.module.scss';

export type WorkSpaceMenu =
  | 'code'
  | 'build'
  | 'test-cases'
  | 'setting'
  | 'misti'
  | 'git'
  | 'contract-verifier';

interface Props {
  activeMenu: WorkSpaceMenu;
  onMenuClicked: (name: WorkSpaceMenu) => void;
  projectName?: string | null;
  isLoaded: boolean;
}

const WorkspaceSidebar: FC<Props> = ({
  activeMenu,
  onMenuClicked,
  projectName,
  isLoaded,
}) => {
  const navigate = useNavigate();

  const handleMenuClick = useCallback(
    (menu: WorkSpaceMenu) => {
      if (!projectName) {
        return;
      }
      onMenuClicked(menu);
    },
    [onMenuClicked, projectName],
  );

  useEffect(() => {
    if (!projectName && isLoaded) {
      setTimeout(() => {
        onMenuClicked('code');
        navigate('/', {
          replace: true,
        });
      }, 1500);
    }
  }, [projectName, onMenuClicked]);

  return (
    <aside className={s.container}>
      <div className={s.menuSection}>
        <SidebarMenu
          isDisabled={!projectName}
          activeMenu={activeMenu}
          onMenuItemClick={handleMenuClick}
        />
      </div>

      <div className={s.footerSection}>
        <Socials />
        <Popover placement="rightTop" title="Setting" content={<AppSetting />}>
          <div className={s.action}>
            <AppIcon className={s.icon} name="Setting" />
          </div>
        </Popover>
        <ThemeSwitcher />
      </div>
    </aside>
  );
};

export default WorkspaceSidebar;
