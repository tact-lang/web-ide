import clsx from 'clsx';
import { FC, ImgHTMLAttributes } from 'react';
import s from './Image.module.scss';

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

const Image: FC<ImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  ...rest
}) => {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={clsx(s.root, className)}
      loading="lazy"
      {...rest}
    />
  );
};

export default Image;
