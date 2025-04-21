import { Popover } from 'antd';
import { FC, useCallback, useEffect } from 'react';

import AppIcon from '@/components/ui/icon';

import { getUrlParams } from '@/utility/url';
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
  onMenuClick: (name: WorkSpaceMenu) => void;
  projectName?: string | null;
  isLoaded: boolean;
}

const WorkspaceSidebar: FC<Props> = ({
  activeMenu,
  onMenuClick,
  projectName,
  isLoaded,
}) => {
  const handleMenuClick = useCallback(
    (menu: WorkSpaceMenu) => {
      if (!projectName) {
        return;
      }
      onMenuClick(menu);
    },
    [onMenuClick, projectName],
  );

  useEffect(() => {
    const { code, importURL } = Object.fromEntries(getUrlParams());
    const shouldRedirectToCode =
      !projectName && isLoaded && !code && !importURL;

    if (shouldRedirectToCode) {
      onMenuClick('code');
    }
  }, [projectName, isLoaded, onMenuClick]);

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
