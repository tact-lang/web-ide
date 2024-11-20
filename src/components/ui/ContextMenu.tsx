import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { FC } from 'react';

interface Props {
  menu?: MenuProps;
  onClick?: (e: MenuInfo) => void;
  children: React.ReactNode;
}

const ContextMenu: FC<Props> = ({ menu, children }) => {
  return (
    <Dropdown menu={menu} trigger={['contextMenu']}>
      {children}
    </Dropdown>
  );
};

export default ContextMenu;
