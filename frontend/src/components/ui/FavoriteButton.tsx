
/**
 * FavoriteButton — Drop-in star/bookmark icon for any card, row, or header.
 * v0.125.73
 *
 * Usage:
 *   <FavoriteButton
 *     entityType="study"
 *     entityId={study.id}
 *     entityLabel={study.name}
 *     entityMeta={{ subtitle: study.phase, moduleId: 'ctms' }}
 *   />
 *
 * Renders a Star icon that fills amber when favorited.
 * onClick is fully isolated — it stops propagation so it can sit inside
 * clickable cards without triggering the card's own navigation.
 */

import { Star } from 'lucide-react';
import { useFavoritesStore, useIsFavorited } from '@/store/useFavoritesStore';
import type { FavoriteEntityType, FavoriteMeta } from '@/store/useFavoritesStore';
import { useToast } from '@/components/ui/Toast';

interface FavoriteButtonProps {
  entityType: FavoriteEntityType;
  entityId: string;
  entityLabel: string;
  entityMeta?: FavoriteMeta;
  /** Extra Tailwind classes for positioning/sizing */
  className?: string;
  /** Icon size class — defaults to w-4 h-4 */
  iconClass?: string;
  /** Show a tooltip on hover */
  showTooltip?: boolean;
}

export function FavoriteButton({
  entityType,
  entityId,
  entityLabel,
  entityMeta,
  className = '',
  iconClass = 'w-4 h-4',
  showTooltip = true,
}: FavoriteButtonProps) {
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFav = useIsFavorited(entityType, entityId);
  const { toast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFavorite(entityType, entityId, entityLabel, entityMeta);
    toast[isFav ? 'info' : 'success'](
      isFav ? `Removed from favorites` : `Added to favorites`,
      { description: entityLabel, duration: 2000 }
    );
  };

  return (
    <button
      onClick={handleClick}
      title={showTooltip ? (isFav ? 'Remove from favorites' : 'Add to favorites') : undefined}
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFav}
      className={`flex items-center justify-center rounded transition-all duration-150
        ${isFav
          ? 'text-amber-400 hover:text-amber-300'
          : 'text-text-muted/40 hover:text-amber-400'
        }
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50
        ${className}`}
    >
      <Star
        className={`${iconClass} transition-all duration-150 ${
          isFav ? 'fill-amber-400' : 'fill-transparent'
        }`}
      />
    </button>
  );
}
