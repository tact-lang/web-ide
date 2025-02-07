import { Tooltip } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { FC, memo, useContext } from 'react';

import { ThemeContext } from '@/components/shared/ThemeProvider';
import s from './WorkspaceSidebar.module.scss';

const ThemeSwitcher: FC = () => {
  const themeContext = useContext(ThemeContext);

  return (
    <Tooltip title="Switch Theme" placement="right">
      <div
        className={`${s.themeSwitch} ${s.action}`}
        onClick={() => themeContext?.toggleTheme()}
      >
        <AppIcon name={themeContext?.theme === 'dark' ? 'Moon' : 'Sun'} />
      </div>
    </Tooltip>
  );
};

export default memo(ThemeSwitcher);
