/**
 * Compound Detail Panel
 * Full compound information view with tabs for properties, batches, samples, and history
 * @version 0.21.3
 */


import React, { useState, useMemo } from 'react';
import {
  Atom,
  X,
  Edit3,
  Save,
  Trash2,
  Plus,
  Package,
  TestTube,
  History,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Copy,
  Link2,
  Beaker,
  Activity,
  Target,
  Shield,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { CompoundStatus, HazardClass } from '@/types/lab-discovery';

// =============================================================================
// TYPES
// =============================================================================

export interface CompoundDetail {
  id: string;
  compoundId: string;
  name: string;
  synonyms: string[];
  status: CompoundStatus;
  
  // Classification
  therapeuticArea?: string;
  targetClass?: string;
  mechanismOfAction?: string;
  
  // Structure
  molecularFormula?: string;
  molecularWeight?: number;
  smiles?: string;
  inchi?: string;
  inchiKey?: string;
  structureImageUrl?: string;
  
  // Properties
  logP?: number;
  pKa?: number;
  solubility?: string;
  permeability?: string;
  
  // Safety
  hazardClasses: HazardClass[];
  handlingPrecautions?: string;
  storageRequirements?: string;
  
  // Project linkage
  projectId?: string;
  projectName?: string;
  programId?: string;
  programName?: string;
  
  // Tracking
  registeredBy: string;
  registeredAt: Date;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  
  // Related entities
  batchCount: number;
  sampleCount: number;
  experimentCount: number;
}

export interface CompoundBatch {
  id: string;
  batchNumber: string;
  status: string;
  purity?: number;
  quantity: number;
  unit: string;
  manufacturingDate: Date;
  expiryDate?: Date;
}

export interface CompoundSample {
  id: string;
  sampleId: string;
  batchNumber?: string;
  status: string;
  type: string;
  quantity: number;
  unit: string;
  location?: string;
}

export interface CompoundExperiment {
  id: string;
  experimentId: string;
  title: string;
  type: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CompoundActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: Date;
}

type DetailTab = 'overview' | 'structure' | 'batches' | 'samples' | 'experiments' | 'history';

export interface CompoundDetailPanelProps {
  compound: CompoundDetail;
  batches?: CompoundBatch[];
  samples?: CompoundSample[];
  experiments?: CompoundExperiment[];
  activities?: CompoundActivity[];
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCreateBatch?: () => void;
  onViewBatch?: (batchId: string) => void;
  onViewSample?: (sampleId: string) => void;
  onViewExperiment?: (experimentId: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusColor(status: CompoundStatus): string {
  const colors: Record<CompoundStatus, string> = {
    VIRTUAL: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    SYNTHESIZED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CHARACTERIZED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    INACTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    DISCONTINUED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return colors[status] || colors.VIRTUAL;
}

function getStatusLabel(status: CompoundStatus): string {
  const labels: Record<CompoundStatus, string> = {
    VIRTUAL: 'Virtual',
    SYNTHESIZED: 'Synthesized',
    CHARACTERIZED: 'Characterized',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    DISCONTINUED: 'Discontinued',
  };
  return labels[status] || status;
}

function getHazardLabel(hazard: HazardClass): string {
  const labels: Record<HazardClass, string> = {
    NONE: 'None',
    FLAMMABLE: 'Flammable',
    CORROSIVE: 'Corrosive',
    TOXIC: 'Toxic',
    OXIDIZER: 'Oxidizer',
    BIOHAZARD: 'Biohazard',
    RADIOACTIVE: 'Radioactive',
    CYTOTOXIC: 'Cytotoxic',
    CONTROLLED_SUBSTANCE: 'Controlled',
  };
  return labels[hazard] || hazard;
}

function getHazardColor(hazard: HazardClass): string {
  const colors: Record<HazardClass, string> = {
    NONE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    FLAMMABLE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    CORROSIVE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    TOXIC: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    OXIDIZER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    BIOHAZARD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    RADIOACTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    CYTOTOXIC: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    CONTROLLED_SUBSTANCE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };
  return colors[hazard] || 'bg-gray-100 text-gray-700';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TabButtonProps {
  tab: DetailTab;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

function TabButton({ tab, label, icon: Icon, isActive, badge, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${
          isActive
            ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
            : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface PropertyRowProps {
  label: string;
  value?: string | number | null;
  icon?: LucideIcon;
  copyable?: boolean;
}

function PropertyRow({ label, value, icon: Icon, copyable }: PropertyRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (value === undefined || value === null) return null;

  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-xs truncate">
          {value}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CompoundDetailPanel({
  compound,
  batches = [],
  samples = [],
  experiments = [],
  activities = [],
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onCreateBatch,
  onViewBatch,
  onViewSample,
  onViewExperiment,
}: CompoundDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Atom className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {compound.compoundId}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(compound.status)}`}>
                    {getStatusLabel(compound.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{compound.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            <TabButton
              tab="overview"
              label="Overview"
              icon={FileText}
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              tab="structure"
              label="Structure"
              icon={Atom}
              isActive={activeTab === 'structure'}
              onClick={() => setActiveTab('structure')}
            />
            <TabButton
              tab="batches"
              label="Batches"
              icon={Package}
              isActive={activeTab === 'batches'}
              badge={compound.batchCount}
              onClick={() => setActiveTab('batches')}
            />
            <TabButton
              tab="samples"
              label="Samples"
              icon={TestTube}
              isActive={activeTab === 'samples'}
              badge={compound.sampleCount}
              onClick={() => setActiveTab('samples')}
            />
            <TabButton
              tab="experiments"
              label="Experiments"
              icon={Beaker}
              isActive={activeTab === 'experiments'}
              badge={compound.experimentCount}
              onClick={() => setActiveTab('experiments')}
            />
            <TabButton
              tab="history"
              label="History"
              icon={History}
              isActive={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <Package className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{compound.batchCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Batches</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <TestTube className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{compound.sampleCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Samples</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <Beaker className="h-6 w-6 mx-auto text-teal-500 mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{compound.experimentCount}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Experiments</div>
                </div>
              </div>

              {/* Classification */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Classification
                </h3>
                <PropertyRow label="Therapeutic Area" value={compound.therapeuticArea} />
                <PropertyRow label="Target Class" value={compound.targetClass} />
                <PropertyRow label="Mechanism of Action" value={compound.mechanismOfAction} />
              </div>

              {/* Molecular Properties */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Atom className="h-4 w-4" />
                  Molecular Properties
                </h3>
                <PropertyRow label="Molecular Formula" value={compound.molecularFormula} />
                <PropertyRow label="Molecular Weight" value={compound.molecularWeight ? `${compound.molecularWeight.toFixed(2)} g/mol` : undefined} />
                <PropertyRow label="LogP" value={compound.logP?.toFixed(2)} />
                <PropertyRow label="pKa" value={compound.pKa?.toFixed(2)} />
                <PropertyRow label="Solubility" value={compound.solubility} />
                <PropertyRow label="Permeability" value={compound.permeability} />
              </div>

              {/* Hazards */}
              {compound.hazardClasses.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Hazard Classifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {compound.hazardClasses.map((hazard) => (
                      <span
                        key={hazard}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getHazardColor(hazard)}`}
                      >
                        {hazard}: {getHazardLabel(hazard)}
                      </span>
                    ))}
                  </div>
                  {compound.handlingPrecautions && (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Handling:</strong> {compound.handlingPrecautions}
                    </p>
                  )}
                  {compound.storageRequirements && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <strong>Storage:</strong> {compound.storageRequirements}
                    </p>
                  )}
                </div>
              )}

              {/* Project Linkage */}
              {(compound.projectName || compound.programName) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Project Linkage
                  </h3>
                  <PropertyRow label="Program" value={compound.programName} icon={Shield} />
                  <PropertyRow label="Project" value={compound.projectName} icon={Target} />
                </div>
              )}

              {/* Registration Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Registration
                </h3>
                <PropertyRow label="Registered By" value={compound.registeredBy} />
                <PropertyRow label="Registered At" value={formatDateTime(compound.registeredAt)} />
                {compound.lastModifiedBy && (
                  <>
                    <PropertyRow label="Last Modified By" value={compound.lastModifiedBy} />
                    <PropertyRow label="Last Modified At" value={compound.lastModifiedAt ? formatDateTime(compound.lastModifiedAt) : undefined} />
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-6">
              {/* Structure Image */}
              {compound.structureImageUrl ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-center">
                  <img
                    src={compound.structureImageUrl}
                    alt={`Structure of ${compound.name}`}
                    className="max-w-full max-h-64"
                  />
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
                  <Atom className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No structure image available</p>
                </div>
              )}

              {/* Identifiers */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Chemical Identifiers
                </h3>
                <PropertyRow label="SMILES" value={compound.smiles} copyable />
                <PropertyRow label="InChI" value={compound.inchi} copyable />
                <PropertyRow label="InChI Key" value={compound.inchiKey} copyable />
              </div>

              {/* Synonyms */}
              {compound.synonyms.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Synonyms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {compound.synonyms.map((syn, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                      >
                        {syn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'batches' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {batches.length} Batches
                </h3>
                {onCreateBatch && (
                  <button
                    onClick={onCreateBatch}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    New Batch
                  </button>
                )}
              </div>

              {batches.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No batches created yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                      onClick={() => onViewBatch?.(batch.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {batch.batchNumber}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            batch.status === 'RELEASED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            batch.status === 'QC_IN_PROGRESS' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {batch.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        {batch.purity && <span>Purity: {batch.purity.toFixed(1)}%</span>}
                        <span>{batch.quantity} {batch.unit}</span>
                        <span>Mfg: {formatDate(batch.manufacturingDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {samples.length} Samples
              </h3>

              {samples.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <TestTube className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No samples registered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {samples.map((sample) => (
                    <div
                      key={sample.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                      onClick={() => onViewSample?.(sample.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {sample.sampleId}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            sample.status === 'IN_STORAGE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            sample.status === 'IN_USE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {sample.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{sample.type}</span>
                        <span>{sample.quantity} {sample.unit}</span>
                        {sample.location && <span>{sample.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'experiments' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {experiments.length} Experiments
              </h3>

              {experiments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Beaker className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No experiments linked yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {experiments.map((exp) => (
                    <div
                      key={exp.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                      onClick={() => onViewExperiment?.(exp.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {exp.experimentId}
                          </span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            exp.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                            exp.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {exp.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{exp.title}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>{exp.type}</span>
                        {exp.startDate && <span>Started: {formatDate(exp.startDate)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Activity History
              </h3>

              {activities.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <History className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No activity recorded yet</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="relative pl-10">
                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900" />
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.action}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(activity.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">by {activity.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
                Delete Compound
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MOCK DATA FACTORY
// =============================================================================

export function createMockCompoundDetail(overrides: Partial<CompoundDetail> = {}): CompoundDetail {
  return {
    id: 'compound-1',
    compoundId: 'ABC-10001',
    name: 'Ligaturimab',
    synonyms: ['LGT-001', 'Anti-CD47 mAb'],
    status: 'ACTIVE',
    therapeuticArea: 'Oncology',
    targetClass: 'Immune Checkpoint',
    mechanismOfAction: 'CD47/SIRPα pathway inhibitor',
    molecularFormula: 'C6462H9990N1738O2012S42',
    molecularWeight: 145872.5,
    smiles: 'CC(C)CC(NC(=O)C(CC1=CC=CC=C1)NC(=O)CN)C(=O)NC(CCC(=O)O)C(=O)O',
    inchi: 'InChI=1S/C24H38N4O7/c1-14(2)11-17(24(34)27-16(10-9-21(29)30)23(33)35-3)26-22(32)18(12-15-7-5-4-6-8-15)25-19(31)13-28/h4-8,14,16-18H,9-13,25,28H2,1-3H3,(H,26,32)(H,27,34)(H,29,30)/t16-,17-,18-/m0/s1',
    inchiKey: 'BQJCRHHNABKAKU-KBQPJGBKSA-N',
    logP: 2.45,
    pKa: 4.2,
    solubility: '>10 mg/mL in PBS',
    permeability: 'High',
    hazardClasses: ['TOXIC', 'CYTOTOXIC'],
    handlingPrecautions: 'Handle with appropriate PPE. Avoid skin contact.',
    storageRequirements: 'Store at -20°C protected from light',
    projectId: 'proj-001',
    projectName: 'LGT-001 Development',
    programId: 'prog-001',
    programName: 'Immuno-Oncology Platform',
    registeredBy: 'Dr. Smith',
    registeredAt: new Date('2024-06-15'),
    lastModifiedBy: 'Dr. Johnson',
    lastModifiedAt: new Date('2025-01-10'),
    batchCount: 5,
    sampleCount: 23,
    experimentCount: 12,
    ...overrides,
  };
}

export default CompoundDetailPanel;
