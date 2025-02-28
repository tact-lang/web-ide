import clsx from 'clsx';
import { FC } from 'react';
import { Link as RouterLink, type LinkProps } from 'react-router-dom';
import s from './Link.module.scss';

const Link: FC<LinkProps> = ({ className, to, ...rest }) => {
  return <RouterLink {...rest} to={to} className={clsx(className, s.root)} />;
};

export default Link;
