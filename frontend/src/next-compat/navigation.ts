/**
 * Compat shim for `next/navigation` on top of react-router-dom v7.
 * Covers the hooks used in this codebase: useRouter, useSearchParams,
 * useParams, usePathname, redirect, notFound.
 */
import {
  useNavigate,
  useLocation,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => navigate(0),
    prefetch: (_href: string) => {},
  };
}

/** Next returns a ReadonlyURLSearchParams; URLSearchParams is API-compatible. */
export function useSearchParams(): URLSearchParams {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return useRouterParams() as unknown as T;
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function redirect(url: string): never {
  window.location.assign(url);
  throw new Error('NEXT_REDIRECT');
}

export function notFound(): never {
  throw new Error('NEXT_NOT_FOUND');
}
