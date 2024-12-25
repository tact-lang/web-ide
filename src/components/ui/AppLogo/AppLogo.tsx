import Image from 'next/image';
import Link from 'next/link';
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
      href={href}
      className={`${s.root} ${className}`}
      onClick={(e) => {
        if (href === '#') {
          e.preventDefault();
        }
      }}
    >
      <Image className={s.brandImage} src={src} width={45} height={45} alt="" />
    </Link>
  );
};

export default AppLogo;
