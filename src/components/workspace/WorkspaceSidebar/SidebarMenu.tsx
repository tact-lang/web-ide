import { Tooltip } from '@/components/ui';
import AppIcon, { AppIconType } from '@/components/ui/icon';
import { FC } from 'react';

import clsx from 'clsx';
import { WorkSpaceMenu } from './WorkspaceSidebar';
import s from './WorkspaceSidebar.module.scss';

export interface IMenuItem {
  label: string;
  value: WorkSpaceMenu;
  icon: string;
}

const menuItems: IMenuItem[] = [
  {
    label: 'Code',
    value: 'code',
    icon: 'Code',
  },
  {
    label: 'Build & Deploy',
    value: 'build',
    icon: 'Beaker',
  },
  {
    label: 'Unit Test',
    value: 'test-cases',
    icon: 'Test',
  },
  {
    label: 'Misti Static Analyzer',
    value: 'misti',
    icon: 'CodeScan',
  },
  {
    label: 'Git',
    value: 'git',
    icon: 'GitBranch',
  },
  {
    label: 'Contract Verifier',
    value: 'contract-verifier',
    icon: 'TonVerifier',
  },
];

interface Props {
  activeMenu: WorkSpaceMenu;
  isDisabled: boolean;
  onMenuItemClick: (menu: WorkSpaceMenu) => void;
}
const SidebarMenu: FC<Props> = ({
  activeMenu,
  isDisabled,
  onMenuItemClick,
}) => {
  return (
    <>
      {menuItems.map((menu) => (
        <Tooltip key={menu.value} title={menu.label} placement="right">
          <div
            className={clsx(
              s.action,
              activeMenu === menu.value && s.isActive,
              isDisabled && s.disabled,
            )}
            onClick={() => {
              onMenuItemClick(menu.value);
            }}
          >
            <AppIcon className={s.icon} name={menu.icon as AppIconType} />
          </div>
        </Tooltip>
      ))}
    </>
  );
};

export default SidebarMenu;
