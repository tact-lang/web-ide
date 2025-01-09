import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { FC } from 'react';

interface Props {
  menu?: MenuProps;
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
