
/**
 * FavoritesPanel — Slide-over panel displaying all favorited items.
 * v0.125.73
 *
 * Opened by the bookmark icon in the Header or "My Favorites" sidebar section.
 * Grouped by entity type. Each item navigates to its module on click.
 * Inline remove button on each row.
 */

import { X, Star, BookOpen, FileText, Send, Bot, Layers, Trash2, StarOff } from 'lucide-react';
import { useFavoritesStore, useFavoritesByType } from '@/store/useFavoritesStore';
import type { FavoriteEntityType, UserFavorite } from '@/store/useFavoritesStore';
import { useAppStore } from '@/store/useAppStore';

// ── Entity type display config ────────────────────────────────────────────────

const TYPE_CONFIG: Record<FavoriteEntityType, { label: string; icon: React.ReactNode; color: string }> = {
  study: {
    label: 'Studies',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'text-purple-400',
  },
  document: {
    label: 'Documents',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: 'text-blue-400',
  },
  submission: {
    label: 'Submissions',
    icon: <Send className="w-3.5 h-3.5" />,
    color: 'text-emerald-400',
  },
  agent: {
    label: 'Agents',
    icon: <Bot className="w-3.5 h-3.5" />,
    color: 'text-violet-400',
  },
  module: {
    label: 'Modules',
    icon: <Layers className="w-3.5 h-3.5" />,
    color: 'text-amber-400',
  },
};

const TYPE_ORDER: FavoriteEntityType[] = ['study', 'document', 'submission', 'agent', 'module'];

// ── Sub-components ────────────────────────────────────────────────────────────

function FavoriteRow({
  fav,
  onNavigate,
  onRemove,
}: {
  fav: UserFavorite;
  onNavigate: (fav: UserFavorite) => void;
  onRemove: (fav: UserFavorite) => void;
}) {
  return (
    <div className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-card transition-colors">
      <button
        onClick={() => onNavigate(fav)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-sm text-text-primary truncate font-medium">{fav.entityLabel}</div>
        {fav.entityMeta?.subtitle && (
          <div className="text-[11px] text-text-muted truncate mt-0.5">{fav.entityMeta.subtitle}</div>
        )}
      </button>
      <button
        onClick={() => onRemove(fav)}
        title="Remove from favorites"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function FavoritesPanel() {
  const isPanelOpen = useFavoritesStore((s) => s.isPanelOpen);
  const closePanel = useFavoritesStore((s) => s.closePanel);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const clearAll = useFavoritesStore((s) => s.clearAll);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const groups = useFavoritesByType();

  const totalCount = Object.values(groups).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);

  const handleNavigate = (fav: UserFavorite) => {
    if (fav.entityMeta?.moduleId) {
      setActiveModule(fav.entityMeta.moduleId);
    }
    closePanel();
  };

  const handleRemove = (fav: UserFavorite) => {
    removeFavorite(fav.entityType, fav.entityId);
  };

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={closePanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-surface-elevated border-l border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="font-semibold text-sm text-text-primary">My Favorites</span>
            {totalCount > 0 && (
              <span className="text-[11px] text-text-muted bg-surface-card px-1.5 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {totalCount > 0 && (
              <button
                onClick={clearAll}
                title="Clear all favorites"
                className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-red-400 transition-colors text-[11px] flex items-center gap-1"
              >
                <StarOff className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closePanel}
              className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
              <Star className="w-10 h-10 text-text-muted/20" />
              <p className="text-sm text-text-muted">No favorites yet</p>
              <p className="text-xs text-text-muted/60">
                Click the ★ icon on any study, document, submission, or agent to bookmark it here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {TYPE_ORDER.map((type) => {
                const items = groups[type];
                if (!items || items.length === 0) return null;
                const config = TYPE_CONFIG[type];

                return (
                  <div key={type} className="mb-1">
                    {/* Group header */}
                    <div className={`flex items-center gap-1.5 px-3 pt-3 pb-1 ${config.color}`}>
                      {config.icon}
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {config.label}
                      </span>
                      <span className="text-[10px] text-text-muted/60 ml-auto">
                        {items.length}
                      </span>
                    </div>

                    {/* Rows */}
                    {items.map((fav) => (
                      <FavoriteRow
                        key={fav.id}
                        fav={fav}
                        onNavigate={handleNavigate}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-text-muted/50 text-center">
            Favorites sync across sessions
          </p>
        </div>
      </div>
    </>
  );
}
