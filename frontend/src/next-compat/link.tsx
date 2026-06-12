/**
 * Compat shim for `next/link` on top of react-router-dom's Link.
 */
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
  children?: React.ReactNode;
}

export default function Link({ href, prefetch, scroll, replace, children, ...rest }: LinkProps) {
  return (
    <RouterLink to={href} replace={replace} {...rest}>
      {children}
    </RouterLink>
  );
}
