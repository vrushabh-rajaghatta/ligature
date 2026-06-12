
import { Construction } from 'lucide-react';
import { ModuleId } from '@/types/core';

interface PlaceholderScreenProps {
  moduleId: ModuleId;
  moduleName: string;
}

const moduleDescriptions: Record<string, string> = {
  research: 'Manage research portfolio, discovery programs, and early-stage development activities.',
  safety: 'Track pharmacovigilance activities, adverse events, and safety signal management.',
  quality: 'Manage CMC documentation, quality systems, and manufacturing oversight.',
  authoring: 'Create and manage regulatory documents with AI-assisted content authoring.',
  labeling: 'Manage global labeling content, variations, and artwork across markets.',
  publishing: 'Assemble and publish eCTD submissions with automated QC and validation.',
  haq: 'Track and respond to health authority questions with intelligent response management.',
  'supply-chain': 'Track regulatory requirements across your manufacturing and supply network.',
  publications: 'Manage scientific publications, abstracts, and medical communications.',
  admin: 'System administration, integrations, user management, and audit logs.',
};

export function PlaceholderScreen({ moduleId, moduleName }: PlaceholderScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-surface-elevated rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Construction className="w-8 h-8 text-accent-amber" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary mb-3">{moduleName}</h2>
        <p className="text-text-secondary mb-6">
          {moduleDescriptions[moduleId] || 'This module is coming soon.'}
        </p>
        <div className="bg-surface-elevated rounded-xl p-4 text-left">
          <div className="text-xs text-text-muted mb-2">Module Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent-amber rounded-full animate-pulse" />
            <span className="text-sm text-accent-amber">In Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
