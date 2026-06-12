/**
 * Compat shim for `next/image` — renders a plain <img>.
 * Next-specific props (priority, quality, fill, loader, placeholder) are
 * accepted and dropped; `fill` maps to absolute-positioned full-size.
 */
import React, { ImgHTMLAttributes } from 'react';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
  priority?: boolean;
  quality?: number;
  fill?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  loader?: unknown;
  unoptimized?: boolean;
}

export default function Image({
  priority,
  quality,
  fill,
  placeholder,
  blurDataURL,
  loader,
  unoptimized,
  style,
  alt = '',
  ...rest
}: ImageProps) {
  const fillStyle: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
    : {};
  return <img alt={alt} style={{ ...fillStyle, ...style }} loading={priority ? 'eager' : rest.loading} {...rest} />;
}
