import { Image, Link } from '@/components/shared';
import { FC } from 'react';
import s from './AppLogo.module.scss';

interface Props {
  src?: string;
  href?: string;
  className?: string;
}

const AppLogo: FC<Props> = ({
  src = '/images/logo.svg',
  href = '/',
  className = '',
}) => {
  return (
    <Link
      to={href}
      className={`${s.root} ${className}`}
      onClick={(e) => {
        if (href === '#') {
          e.preventDefault();
        }
      }}
    >
      <Image className={s.brandImage} src={src} width={20} height={20} alt="" />
    </Link>
  );
};

export default AppLogo;
