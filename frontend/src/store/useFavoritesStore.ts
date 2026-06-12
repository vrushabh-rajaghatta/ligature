/**
 * useFavoritesStore — User Favorites / Bookmarks
 * v0.125.73
 *
 * Persisted via localStorage (Zustand persist middleware).
 * Async Supabase write-through on add/remove for cross-device sync.
 *
 * Entity types: 'study' | 'document' | 'submission' | 'agent' | 'module'
 * Used by:
 *   - FavoriteButton (drop-in star icon for any card)
 *   - FavoritesPanel (slide-over list)
 *   - Sidebar "My Favorites" section
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// TYPES
// ============================================================================

export type FavoriteEntityType = 'study' | 'document' | 'submission' | 'agent' | 'module';

export interface FavoriteMeta {
  subtitle?: string;
  moduleId?: string;  // for navigation
  href?: string;
  iconName?: string;  // lucide icon name for rendering
}

export interface UserFavorite {
  id: string;
  entityType: FavoriteEntityType;
  entityId: string;
  entityLabel: string;
  entityMeta?: FavoriteMeta;
  createdAt: string;
}

interface FavoritesState {
  favorites: UserFavorite[];
  isPanelOpen: boolean;
  isLoading: boolean;
}

interface FavoritesActions {
  addFavorite: (
    entityType: FavoriteEntityType,
    entityId: string,
    entityLabel: string,
    entityMeta?: FavoriteMeta
  ) => void;
  removeFavorite: (entityType: FavoriteEntityType, entityId: string) => void;
  toggleFavorite: (
    entityType: FavoriteEntityType,
    entityId: string,
    entityLabel: string,
    entityMeta?: FavoriteMeta
  ) => void;
  isFavorited: (entityType: FavoriteEntityType, entityId: string) => boolean;
  openPanel: () => void;
  closePanel: () => void;
  getFavoritesByType: (entityType: FavoriteEntityType) => UserFavorite[];
  clearAll: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const genId = () => `fav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

// Async Supabase write-through — fire-and-forget, never throws
async function syncAddToSupabase(fav: UserFavorite): Promise<void> {
  try {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: fav.entityType,
        entityId: fav.entityId,
        entityLabel: fav.entityLabel,
        entityMeta: fav.entityMeta ?? null,
      }),
    });
  } catch {
    // Silent — localStorage is the source of truth
  }
}

async function syncRemoveFromSupabase(entityType: FavoriteEntityType, entityId: string): Promise<void> {
  try {
    await fetch(`/api/favorites?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, {
      method: 'DELETE',
    });
  } catch {
    // Silent
  }
}

// ============================================================================
// STORE
// ============================================================================

export const useFavoritesStore = create<FavoritesState & FavoritesActions>()(
  devtools(
    persist(
      (set, get) => ({
        favorites: [],
        isPanelOpen: false,
        isLoading: false,

        addFavorite: (entityType, entityId, entityLabel, entityMeta) => {
          const exists = get().favorites.some(
            (f) => f.entityType === entityType && f.entityId === entityId
          );
          if (exists) return;

          const fav: UserFavorite = {
            id: genId(),
            entityType,
            entityId,
            entityLabel,
            entityMeta,
            createdAt: now(),
          };

          set(
            (state) => ({ favorites: [fav, ...state.favorites] }),
            false,
            'addFavorite'
          );

          // Fire-and-forget Supabase sync
          syncAddToSupabase(fav);
        },

        removeFavorite: (entityType, entityId) => {
          set(
            (state) => ({
              favorites: state.favorites.filter(
                (f) => !(f.entityType === entityType && f.entityId === entityId)
              ),
            }),
            false,
            'removeFavorite'
          );

          syncRemoveFromSupabase(entityType, entityId);
        },

        toggleFavorite: (entityType, entityId, entityLabel, entityMeta) => {
          const isFav = get().isFavorited(entityType, entityId);
          if (isFav) {
            get().removeFavorite(entityType, entityId);
          } else {
            get().addFavorite(entityType, entityId, entityLabel, entityMeta);
          }
        },

        isFavorited: (entityType, entityId) => {
          return get().favorites.some(
            (f) => f.entityType === entityType && f.entityId === entityId
          );
        },

        openPanel: () => set({ isPanelOpen: true }, false, 'openPanel'),
        closePanel: () => set({ isPanelOpen: false }, false, 'closePanel'),

        getFavoritesByType: (entityType) => {
          return get().favorites.filter((f) => f.entityType === entityType);
        },

        clearAll: () => set({ favorites: [] }, false, 'clearAll'),
      }),
      {
        name: 'ligature-favorites',
        partialize: (state) => ({ favorites: state.favorites }),
      }
    ),
    { name: 'FavoritesStore' }
  )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/** Total favorite count. */
export const useFavoriteCount = () => {
  const favorites = useFavoritesStore(useShallow((s) => s.favorites));
  return favorites.length;
};

/** Whether a specific entity is favorited. */
export const useIsFavorited = (entityType: FavoriteEntityType, entityId: string) => {
  const favorites = useFavoritesStore(useShallow((s) => s.favorites));
  return useMemo(
    () => favorites.some((f) => f.entityType === entityType && f.entityId === entityId),
    [favorites, entityType, entityId]
  );
};

/** Favorites grouped by entity type for panel display. */
export const useFavoritesByType = () => {
  const favorites = useFavoritesStore(useShallow((s) => s.favorites));
  return useMemo(() => {
    const groups: Partial<Record<FavoriteEntityType, UserFavorite[]>> = {};
    for (const fav of favorites) {
      if (!groups[fav.entityType]) groups[fav.entityType] = [];
      groups[fav.entityType]!.push(fav);
    }
    return groups;
  }, [favorites]);
};

/** Recent favorites for sidebar preview (top N). */
export const useRecentFavorites = (limit = 5) => {
  const favorites = useFavoritesStore(useShallow((s) => s.favorites));
  return useMemo(() => favorites.slice(0, limit), [favorites, limit]);
};
