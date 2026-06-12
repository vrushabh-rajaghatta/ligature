
/**
 * ArtifactBadge — v0.125.32
 *
 * Compact badge indicating whether a document is:
 *   master   — the single shared source of truth
 *   derived  — a local variant referencing a master
 *   archive  — a frozen as-submitted snapshot (immutable)
 */

import { Share2, GitBranch, Archive } from 'lucide-react';

export type ArtifactType = 'master' | 'derived' | 'archive';

interface ArtifactBadgeProps {
  type: ArtifactType;
  size?: 'xs' | 'sm';
  showIcon?: boolean;
}

const CONFIG: Record<ArtifactType, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  master: {
    label: 'Master',
    icon: <Share2 className="w-3 h-3" />,
    className: 'bg-violet-500/12 text-violet-400 border-violet-500/25',
  },
  derived: {
    label: 'Derived',
    icon: <GitBranch className="w-3 h-3" />,
    className: 'bg-blue-500/12 text-blue-400 border-blue-500/25',
  },
  archive: {
    label: 'Archive',
    icon: <Archive className="w-3 h-3" />,
    className: 'bg-amber-500/12 text-amber-400 border-amber-500/25',
  },
};

export function ArtifactBadge({ type, size = 'sm', showIcon = true }: ArtifactBadgeProps) {
  const cfg = CONFIG[type];
  const px = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded border font-medium ${px} ${cfg.className}`}>
      {showIcon && cfg.icon}
      {cfg.label}
    </span>
  );
}
