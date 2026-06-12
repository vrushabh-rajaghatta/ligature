/**
 * Compat shim for `next/dynamic` on top of React.lazy + Suspense.
 * Supports the subset used in this codebase: loader + { loading, ssr }.
 */
import React, { ComponentType, lazy, Suspense } from 'react';

interface DynamicOptions {
  loading?: ComponentType;
  ssr?: boolean;
}

export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options: DynamicOptions = {}
): ComponentType<P> {
  const LazyComponent = lazy(loader);
  const Loading = options.loading;
  const Dynamic = (props: P) => (
    <Suspense fallback={Loading ? <Loading /> : null}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  );
  Dynamic.displayName = 'NextCompatDynamic';
  return Dynamic;
}
