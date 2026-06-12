/**
 * useDeadClick — safe fallback for buttons not yet wired to actions.
 *
 * Returns a `dead` function that fires a toast instead of silently doing
 * nothing. Apply to any button that doesn't have a real handler yet.
 *
 * Usage:
 *   const { dead } = useDeadClick();
 *   <button onClick={dead}>Export</button>
 *
 *   // With a custom label for better feedback:
 *   <button onClick={dead('Export Report')}>Export</button>
 */
import { useToast } from '@/components/ui/Toast';
import { useCallback } from 'react';

export function useDeadClick() {
  const toast = useToast();

  const dead = useCallback(
    (label?: string) => () => {
      toast.info(label ? `${label} — coming in a future release` : 'This action is coming in a future release');
    },
    [toast]
  );

  // Convenience: a pre-bound version with no label
  const deadClick = useCallback(() => {
    toast.info('This action is coming in a future release');
  }, [toast]);

  return { dead, deadClick };
}
