import { Tooltip } from '@/components/ui';
import AppIcon, { AppIconType } from '@/components/ui/icon';
import Link from 'next/link';
import { FC } from 'react';

import { AppData } from '@/constant/AppData';
import s from './WorkspaceSidebar.module.scss';

const Socials: FC = () => (
  <>
    {AppData.socials.map((social) => (
      <Tooltip key={social.label} title={social.label} placement="right">
        <Link
          href={social.url}
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
