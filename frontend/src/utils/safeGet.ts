/**
 * safeGet — safe config/map lookup utility
 * Prevents TypeError crashes when a data-driven key is missing from a config map.
 */
export function safeGet<T>(
  map: Record<string, T>,
  key: string | undefined | null,
  fallback: T
): T {
  if (key == null) return fallback;
  return map[key] ?? fallback;
}

export function safeLabel(
  map: Record<string, { label: string }>,
  key: string | undefined | null
): string {
  if (key == null) return '';
  return map[key]?.label ?? key;
}

export function safeColor(
  map: Record<string, { color: string }>,
  key: string | undefined | null,
  fallback = 'gray'
): string {
  if (key == null) return fallback;
  return map[key]?.color ?? fallback;
}
