import { Tooltip } from '@/components/ui';
import AppIcon, { AppIconType } from '@/components/ui/icon';
import { FC } from 'react';

import { Link } from '@/components/shared';
import { AppData } from '@/constant/AppData';
import s from './WorkspaceSidebar.module.scss';

const Socials: FC = () => (
  <>
    {AppData.socials.map((social) => (
      <Tooltip key={social.label} title={social.label} placement="right">
        <Link
          to={social.url}
          className={s.action}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
        >
          <AppIcon className={s.icon} name={social.icon as AppIconType} />
        </Link>
      </Tooltip>
    ))}
  </>
);

export default Socials;
