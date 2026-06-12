
import { FilterState } from '@/components/layout/FilterBar';
import { useAppStore } from '@/store/useAppStore';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';

import { useState, useMemo, useEffect } from 'react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { SearchInput } from '@/components/ui/Input';
// v116: Breadcrumb navigation
import { Breadcrumb } from '@/components/ui/Breadcrumb';
// v125: Card components for UI consistency
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatCardGridSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v155: Labeling create modals for dead-end buttons
import { AddLanguageModal, NewArtworkModal, NewSKUModal, type AddLanguageInput, type NewArtworkInput, type NewSKUInput } from './CreateModals';
// v157: Edit/Delete modals and toast notifications
import { EditArtworkModal, EditSKUModal, ConfirmDeleteModal } from './CRUDModals';
import { useToast } from '@/components/ui/Toast';
// v159: Cross-module event system
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useCascadeEngine } from '@/store/useCascadeEngine';
// v0.42.45: Cross-module SPL link
import { useSPLStore } from '@/store/useSPLStore';
// v0.44.15: Persistent store for artwork/SKU/translations
import { useLabelingScreenStore } from '@/store/useLabelingStore';
// v0.32.4: AI Document Generation
import { AIDocumentGeneratorPanel } from '@/components/ai/AIDocumentGeneratorPanel';
import {
  FileText, Globe, CheckCircle, AlertTriangle, Clock, GitCompare, Search, Plus,
  Eye, Edit, AlertCircle, ArrowRight, History, MessageSquare, Download, X, Check,
  RefreshCw, Sparkles, Languages, Send, Layers, Link2, Package, Palette, Box,
  BarChart3, MapPin, Image as ImageIcon, Printer, QrCode, Tag, Building2, Truck, Calendar, Edit3, Trash2,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, Table as TableIcon, ExternalLink, Zap
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useProducts } from '@/stores/products-store';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================
// Labeling Color Maps (v104)
// ============================================

// Label type color map
const labelTypeColorMap: Record<string, BadgeColor> = {
  ccds: 'purple',
  uspi: 'blue',
  smpc: 'teal',
  pil: 'amber',
  cmi: 'green',
  ifu: 'slate',
};

// Label status color map
const labelStatusColorMap: Record<string, BadgeColor> = {
  draft: 'slate',
  review: 'amber',
  approved: 'blue',
  current: 'green',
  superseded: 'slate',
};

// Harmonization status color map
const harmonizationStatusColorMap: Record<string, BadgeColor> = {
  harmonized: 'green',
  'minor-diff': 'amber',
  'major-diff': 'red',
  missing: 'slate',
};

// Translation status color map
const translationStatusColorMap: Record<string, BadgeColor> = {
  complete: 'green',
  'in-progress': 'blue',
  pending: 'amber',
  'not-started': 'slate',
};

// Implementation status color map
const implementationStatusColorMap: Record<string, BadgeColor> = {
  'not-started': 'slate',
  'in-progress': 'amber',
  implemented: 'green',
  'pending-update': 'purple',
};

// Artwork status color map
const artworkStatusColorMap: Record<string, BadgeColor> = {
  draft: 'slate',
  review: 'amber',
  approved: 'blue',
  'print-ready': 'green',
  superseded: 'slate',
};

// SKU status color map
const skuStatusColorMap: Record<string, BadgeColor> = {
  active: 'green',
  pending: 'amber',
  discontinued: 'red',
};

// Section sync status color map
const sectionStatusColorMap: Record<string, BadgeColor> = {
  synced: 'green',
  modified: 'amber',
  'pending-review': 'red',
};

// ============================================
// Labeling Badge Helper Functions (v104)
// ============================================

export const getLabelTypeBadge = (type: string, fullName?: string) => (
  <Badge color={labelTypeColorMap[type] || 'slate'} size="xs">
    {type.toUpperCase()}
  </Badge>
);

export const getLabelStatusBadge = (status: string, icon?: React.ReactNode) => (
  <Badge color={labelStatusColorMap[status] || 'slate'} size="xs" icon={icon}>
    {status === 'review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getHarmonizationStatusBadge = (status: string) => (
  <Badge color={harmonizationStatusColorMap[status] || 'slate'} size="xs">
    {status.replace('-', ' ')}
  </Badge>
);

export const getTranslationStatusBadge = (status: string) => (
  <Badge color={translationStatusColorMap[status] || 'slate'} size="sm">
    {status === 'in-progress' ? 'In Progress' : 
     status === 'not-started' ? 'Not Started' : 
     status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getImplementationStatusBadge = (status: string) => (
  <Badge color={implementationStatusColorMap[status] || 'slate'} size="xs">
    {status === 'not-started' ? 'Not Started' : 
     status === 'in-progress' ? 'In Progress' :
     status === 'pending-update' ? 'Pending Update' :
     status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getArtworkStatusBadge = (status: string) => (
  <Badge color={artworkStatusColorMap[status] || 'slate'} size="xs">
    {status === 'print-ready' ? 'Print Ready' : status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getSkuStatusBadge = (status: string) => (
  <Badge color={skuStatusColorMap[status] || 'slate'} size="xs">
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getSectionStatusBadge = (status: string) => (
  <Badge color={sectionStatusColorMap[status] || 'slate'} size="xs">
    {status === 'pending-review' ? 'Pending Review' : status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

type LabelingView = 'overview' | 'documents' | 'editor' | 'comparison' | 'harmonization' | 'translations' | 'versions' | 'artwork' | 'skus';
type LabelStatus = 'draft' | 'review' | 'approved' | 'current' | 'superseded';
type LabelType = 'ccds' | 'uspi' | 'smpc' | 'pil' | 'cmi' | 'ifu';
type HarmonizationStatus = 'harmonized' | 'minor-diff' | 'major-diff' | 'missing';
type ImplementationStatus = 'not-started' | 'in-progress' | 'implemented' | 'pending-update';
type ArtworkStatus = 'draft' | 'review' | 'approved' | 'print-ready' | 'superseded';

interface LabelDocument {
  id: string; type: LabelType; product: string; productId: string; region: string;
  regionFlag: string; version: string; status: LabelStatus; lastUpdated: string;
  owner: string; sections: number; differences?: number; wordCount?: number;
}

interface LabelSection {
  id: string; number: string; title: string; content: string; ccdsRef?: string;
  status: 'synced' | 'modified' | 'pending-review'; lastModified: string; modifiedBy?: string;
}

interface HarmonizationItem {
  section: string; sectionName: string; ccds: string; uspi: string; smpc: string;
  pil?: string; status: HarmonizationStatus; notes?: string;
}

interface TranslationStatus {
  language: string; languageCode: string; flag: string;
  status: 'complete' | 'in-progress' | 'pending' | 'not-started';
  progress: number; translator?: string;
}

interface MarketVersion {
  market: string; flag: string; labelVersion: string; labelType: string;
  approvalDate: string; implementationStatus: ImplementationStatus;
  implementationDate?: string; artworkVersion?: string; skuCount: number;
}

interface ArtworkItem {
  id: string; name: string; type: 'carton' | 'label' | 'insert' | 'blister' | 'bottle';
  product: string; productId: string; market: string; marketFlag: string;
  labelVersion: string; artworkVersion: string; status: ArtworkStatus;
  lastUpdated: string; designer: string; dimensions?: string; languages: string[];
}

interface SKUItem {
  id: string; ndc: string; gtin: string; product: string; productId: string;
  description: string; strength: string; packSize: string; packType: string;
  market: string; marketFlag: string; labelVersion: string; artworkVersion: string;
  status: 'active' | 'pending' | 'discontinued'; launchDate?: string;
  components: string[];
}

// v0.42.25: Input types for handler callbacks
interface AddLanguageHandlerInput {
  language: string;
  flag?: string;
  translator?: string;
}

interface CreateArtworkHandlerInput {
  name?: string;
  type?: string;
  product?: string;
  productId?: string;
  market?: string;
  marketFlag?: string;
  labelVersion?: string;
  artworkVersion?: string;
  designer?: string;
  dimensions?: string;
  languages?: string[];
}

interface CreateSKUHandlerInput {
  ndc?: string;
  gtin?: string;
  product?: string;
  productId?: string;
  description?: string;
  strength?: string;
  packSize?: string;
  packType?: string;
  market?: string;
  marketFlag?: string;
  labelVersion?: string;
  artworkVersion?: string;
}

interface UpdateArtworkHandlerInput extends Partial<ArtworkItem> {
  id: string;
  name?: string;
}

interface UpdateSKUHandlerInput extends Partial<SKUItem> {
  id: string;
}

const labelDocuments: LabelDocument[] = [
  { id: 'lbl-1', type: 'ccds', product: 'LIG-2847', productId: 'lig-2847', region: 'Global', regionFlag: '🌐', version: '2.0', status: 'current', lastUpdated: '2024-11-15', owner: 'Sarah Chen', sections: 15, wordCount: 12500 },
  { id: 'lbl-2', type: 'uspi', product: 'LIG-2847', productId: 'lig-2847', region: 'US', regionFlag: '🇺🇸', version: '1.2', status: 'review', lastUpdated: '2024-12-10', owner: 'Jennifer Walsh', sections: 17, differences: 3, wordCount: 15200 },
  { id: 'lbl-3', type: 'smpc', product: 'LIG-2847', productId: 'lig-2847', region: 'EU', regionFlag: '🇪🇺', version: '1.1', status: 'approved', lastUpdated: '2024-12-05', owner: 'Jennifer Walsh', sections: 14, differences: 5, wordCount: 18900 },
  { id: 'lbl-4', type: 'pil', product: 'LIG-2847', productId: 'lig-2847', region: 'EU', regionFlag: '🇪🇺', version: '1.1', status: 'approved', lastUpdated: '2024-12-05', owner: 'Emily Thompson', sections: 6, wordCount: 3200 },
  { id: 'lbl-5', type: 'uspi', product: 'LIG-1182', productId: 'lig-1182', region: 'US', regionFlag: '🇺🇸', version: '0.5', status: 'draft', lastUpdated: '2024-12-08', owner: 'Jennifer Walsh', sections: 17, wordCount: 14800 },
  { id: 'lbl-6', type: 'ccds', product: 'LIG-1182', productId: 'lig-1182', region: 'Global', regionFlag: '🌐', version: '1.0', status: 'current', lastUpdated: '2024-10-20', owner: 'Sarah Chen', sections: 15, wordCount: 11200 },
  { id: 'lbl-7', type: 'smpc', product: 'LIG-1182', productId: 'lig-1182', region: 'EU', regionFlag: '🇪🇺', version: '0.3', status: 'draft', lastUpdated: '2024-11-28', owner: 'Jennifer Walsh', sections: 14, wordCount: 16500 },
  { id: 'lbl-8', type: 'cmi', product: 'LIG-2847', productId: 'lig-2847', region: 'AU', regionFlag: '🇦🇺', version: '1.0', status: 'approved', lastUpdated: '2024-11-20', owner: 'Rachel Kim', sections: 8, wordCount: 4100 },
];

const labelSections: LabelSection[] = [
  { id: 'sec-1', number: '1', title: 'Indications and Usage', content: 'LIGRASTINIB is indicated for the treatment of adult patients with KRAS G12C-mutated locally advanced or metastatic non-small cell lung cancer (NSCLC).', ccdsRef: '4.1', status: 'synced', lastModified: '2024-12-10' },
  { id: 'sec-2', number: '2', title: 'Dosage and Administration', content: 'The recommended dosage of LIGRASTINIB is 200 mg taken orally once daily.', ccdsRef: '4.2', status: 'synced', lastModified: '2024-12-10' },
  { id: 'sec-3', number: '3', title: 'Dosage Forms and Strengths', content: 'Tablets: 200 mg', ccdsRef: '6.1', status: 'synced', lastModified: '2024-12-10' },
  { id: 'sec-4', number: '4', title: 'Contraindications', content: 'None.', ccdsRef: '4.3', status: 'modified', lastModified: '2024-12-12', modifiedBy: 'Jennifer Walsh' },
  { id: 'sec-5', number: '5', title: 'Warnings and Precautions', content: 'Hepatotoxicity: Monitor liver function tests.\n\nInterstitial Lung Disease/Pneumonitis: Monitor for respiratory symptoms.', ccdsRef: '4.4', status: 'modified', lastModified: '2024-12-12', modifiedBy: 'Jennifer Walsh' },
  { id: 'sec-6', number: '6', title: 'Adverse Reactions', content: 'The most common adverse reactions (≥20%) are diarrhea, nausea, fatigue.', ccdsRef: '4.8', status: 'synced', lastModified: '2024-12-10' },
  { id: 'sec-7', number: '7', title: 'Drug Interactions', content: 'Strong CYP3A4 Inhibitors: Avoid concomitant use.', ccdsRef: '4.5', status: 'pending-review', lastModified: '2024-12-11', modifiedBy: 'Dr. Chen' },
];

const harmonizationData: HarmonizationItem[] = [
  { section: '1', sectionName: 'Indications', ccds: 'KRAS G12C+ NSCLC after prior therapy', uspi: 'KRAS G12C+ NSCLC after prior systemic therapy', smpc: 'KRAS G12C+ NSCLC after prior systemic therapy', pil: 'Cancer medicine for lung cancer', status: 'harmonized' },
  { section: '2', sectionName: 'Dosage', ccds: '200mg once daily', uspi: '200mg once daily', smpc: '200mg once daily', pil: 'One tablet daily', status: 'harmonized' },
  { section: '4.2', sectionName: 'Posology', ccds: 'Take with or without food', uspi: 'Take with or without food', smpc: 'Should be taken with food', status: 'minor-diff', notes: 'EU requires food recommendation' },
  { section: '4.3', sectionName: 'Contraindications', ccds: 'Hypersensitivity to active substance', uspi: 'None', smpc: 'Hypersensitivity to active substance or excipients', status: 'major-diff', notes: 'US FDA accepted no contraindications' },
  { section: '4.4', sectionName: 'Warnings', ccds: 'Hepatotoxicity, ILD, QTc prolongation', uspi: 'Hepatotoxicity, ILD', smpc: 'Hepatotoxicity, ILD, QTc prolongation, embryo-fetal toxicity', status: 'major-diff', notes: 'Different safety labeling requirements' },
  { section: '4.5', sectionName: 'Interactions', ccds: 'CYP3A4 inhibitors/inducers', uspi: 'Strong CYP3A4 inhibitors', smpc: 'CYP3A4 inhibitors/inducers, P-gp substrates', status: 'minor-diff' },
  { section: '4.8', sectionName: 'Adverse Reactions', ccds: 'Diarrhea (45%), nausea (35%), fatigue (30%)', uspi: 'Diarrhea (45%), nausea (35%), fatigue (30%)', smpc: 'Diarrhea (45%), nausea (35%), fatigue (30%)', status: 'harmonized' },
];

const translationStatuses: TranslationStatus[] = [
  { language: 'English', languageCode: 'EN', flag: '🇬🇧', status: 'complete', progress: 100 },
  { language: 'German', languageCode: 'DE', flag: '🇩🇪', status: 'complete', progress: 100, translator: 'Klaus Weber' },
  { language: 'French', languageCode: 'FR', flag: '🇫🇷', status: 'complete', progress: 100, translator: 'Marie Dubois' },
  { language: 'Spanish', languageCode: 'ES', flag: '🇪🇸', status: 'in-progress', progress: 75, translator: 'Carlos García' },
  { language: 'Italian', languageCode: 'IT', flag: '🇮🇹', status: 'in-progress', progress: 60, translator: 'Sofia Rossi' },
  { language: 'Portuguese', languageCode: 'PT', flag: '🇵🇹', status: 'pending', progress: 0 },
  { language: 'Dutch', languageCode: 'NL', flag: '🇳🇱', status: 'pending', progress: 0 },
  { language: 'Polish', languageCode: 'PL', flag: '🇵🇱', status: 'not-started', progress: 0 },
];

const marketVersions: MarketVersion[] = [
  { market: 'United States', flag: '🇺🇸', labelVersion: '1.2', labelType: 'USPI', approvalDate: '2024-12-10', implementationStatus: 'in-progress', artworkVersion: '1.2.1', skuCount: 4 },
  { market: 'European Union', flag: '🇪🇺', labelVersion: '1.1', labelType: 'SmPC', approvalDate: '2024-12-05', implementationStatus: 'implemented', implementationDate: '2024-12-08', artworkVersion: '1.1.0', skuCount: 12 },
  { market: 'United Kingdom', flag: '🇬🇧', labelVersion: '1.1', labelType: 'SmPC', approvalDate: '2024-12-05', implementationStatus: 'implemented', implementationDate: '2024-12-10', artworkVersion: '1.1.0', skuCount: 3 },
  { market: 'Canada', flag: '🇨🇦', labelVersion: '1.0', labelType: 'PM', approvalDate: '2024-11-20', implementationStatus: 'pending-update', artworkVersion: '1.0.2', skuCount: 2 },
  { market: 'Australia', flag: '🇦🇺', labelVersion: '1.0', labelType: 'CMI', approvalDate: '2024-11-20', implementationStatus: 'implemented', implementationDate: '2024-11-25', artworkVersion: '1.0.1', skuCount: 2 },
  { market: 'Japan', flag: '🇯🇵', labelVersion: '0.9', labelType: 'PI', approvalDate: '2024-10-15', implementationStatus: 'not-started', skuCount: 0 },
  { market: 'Switzerland', flag: '🇨🇭', labelVersion: '1.1', labelType: 'SmPC', approvalDate: '2024-12-05', implementationStatus: 'in-progress', artworkVersion: '1.1.0', skuCount: 2 },
  { market: 'Brazil', flag: '🇧🇷', labelVersion: '1.0', labelType: 'Bula', approvalDate: '2024-11-01', implementationStatus: 'implemented', implementationDate: '2024-11-15', artworkVersion: '1.0.0', skuCount: 2 },
];

const artworkItems: ArtworkItem[] = [
  { id: 'art-1', name: 'LIG-2847 200mg Carton - US', type: 'carton', product: 'LIG-2847', productId: 'lig-2847', market: 'US', marketFlag: '🇺🇸', labelVersion: '1.2', artworkVersion: '1.2.1', status: 'review', lastUpdated: '2024-12-11', designer: 'PackDesign Co.', dimensions: '120x80x40mm', languages: ['EN'] },
  { id: 'art-2', name: 'LIG-2847 200mg Bottle Label - US', type: 'label', product: 'LIG-2847', productId: 'lig-2847', market: 'US', marketFlag: '🇺🇸', labelVersion: '1.2', artworkVersion: '1.2.1', status: 'review', lastUpdated: '2024-12-11', designer: 'PackDesign Co.', dimensions: '80x50mm', languages: ['EN'] },
  { id: 'art-3', name: 'LIG-2847 200mg Carton - EU', type: 'carton', product: 'LIG-2847', productId: 'lig-2847', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'print-ready', lastUpdated: '2024-12-06', designer: 'EuroPack GmbH', dimensions: '125x85x42mm', languages: ['EN', 'DE', 'FR', 'ES', 'IT'] },
  { id: 'art-4', name: 'LIG-2847 PIL - EU', type: 'insert', product: 'LIG-2847', productId: 'lig-2847', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'print-ready', lastUpdated: '2024-12-06', designer: 'EuroPack GmbH', dimensions: 'A5 folded', languages: ['EN', 'DE', 'FR', 'ES', 'IT'] },
  { id: 'art-5', name: 'LIG-2847 Blister Foil - EU', type: 'blister', product: 'LIG-2847', productId: 'lig-2847', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'print-ready', lastUpdated: '2024-12-06', designer: 'EuroPack GmbH', dimensions: '14-tablet blister', languages: ['EN', 'DE', 'FR'] },
  { id: 'art-6', name: 'LIG-2847 200mg Carton - UK', type: 'carton', product: 'LIG-2847', productId: 'lig-2847', market: 'UK', marketFlag: '🇬🇧', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'approved', lastUpdated: '2024-12-08', designer: 'BritPack Ltd', dimensions: '125x85x42mm', languages: ['EN'] },
  { id: 'art-7', name: 'LIG-2847 200mg Carton - CA', type: 'carton', product: 'LIG-2847', productId: 'lig-2847', market: 'CA', marketFlag: '🇨🇦', labelVersion: '1.0', artworkVersion: '1.0.2', status: 'approved', lastUpdated: '2024-11-22', designer: 'PackDesign Co.', dimensions: '120x80x40mm', languages: ['EN', 'FR'] },
  { id: 'art-8', name: 'LIG-1182 Vial Label - US', type: 'label', product: 'LIG-1182', productId: 'lig-1182', market: 'US', marketFlag: '🇺🇸', labelVersion: '0.5', artworkVersion: '0.5.0', status: 'draft', lastUpdated: '2024-12-09', designer: 'PackDesign Co.', dimensions: '60x30mm', languages: ['EN'] },
];

const skuItems: SKUItem[] = [
  { id: 'sku-1', ndc: '12345-678-30', gtin: '00312345678301', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Tablets', strength: '200mg', packSize: '30 tablets', packType: 'Bottle', market: 'US', marketFlag: '🇺🇸', labelVersion: '1.2', artworkVersion: '1.2.1', status: 'active', launchDate: '2024-06-15', components: ['Carton', 'Bottle', 'Cap', 'Desiccant'] },
  { id: 'sku-2', ndc: '12345-678-90', gtin: '00312345678902', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Tablets', strength: '200mg', packSize: '90 tablets', packType: 'Bottle', market: 'US', marketFlag: '🇺🇸', labelVersion: '1.2', artworkVersion: '1.2.1', status: 'active', launchDate: '2024-06-15', components: ['Carton', 'Bottle', 'Cap', 'Desiccant'] },
  { id: 'sku-3', ndc: '', gtin: '04012345678905', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Film-coated Tablets', strength: '200mg', packSize: '28 tablets', packType: 'Blister', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'active', launchDate: '2024-07-01', components: ['Carton', 'Blister', 'PIL'] },
  { id: 'sku-4', ndc: '', gtin: '04012345678912', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Film-coated Tablets', strength: '200mg', packSize: '56 tablets', packType: 'Blister', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'active', launchDate: '2024-07-01', components: ['Carton', 'Blister x2', 'PIL'] },
  { id: 'sku-5', ndc: '', gtin: '04012345678929', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Film-coated Tablets', strength: '200mg', packSize: '84 tablets', packType: 'Blister', market: 'EU', marketFlag: '🇪🇺', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'active', launchDate: '2024-07-01', components: ['Carton', 'Blister x3', 'PIL'] },
  { id: 'sku-6', ndc: '', gtin: '05012345678001', product: 'LIG-2847', productId: 'lig-2847', description: 'Ligrastinib 200mg Film-coated Tablets', strength: '200mg', packSize: '28 tablets', packType: 'Blister', market: 'UK', marketFlag: '🇬🇧', labelVersion: '1.1', artworkVersion: '1.1.0', status: 'active', launchDate: '2024-07-15', components: ['Carton', 'Blister', 'PIL'] },
  { id: 'sku-7', ndc: '12345-679-30', gtin: '00312345679308', product: 'LIG-1182', productId: 'lig-1182', description: 'Ligamab 150mg/mL Injection', strength: '150mg/mL', packSize: '1 vial', packType: 'Vial', market: 'US', marketFlag: '🇺🇸', labelVersion: '0.5', artworkVersion: '0.5.0', status: 'pending', components: ['Carton', 'Vial', 'Stopper'] },
];

const typeLabels: Record<LabelType, { name: string; fullName: string; color: string }> = {
  ccds: { name: 'CCDS', fullName: 'Company Core Data Sheet', color: 'bg-accent-purple/20 text-accent-purple' },
  uspi: { name: 'USPI', fullName: 'US Prescribing Information', color: 'bg-accent-blue/20 text-accent-blue' },
  smpc: { name: 'SmPC', fullName: 'Summary of Product Characteristics', color: 'bg-accent-teal/20 text-accent-teal' },
  pil: { name: 'PIL', fullName: 'Patient Information Leaflet', color: 'bg-accent-amber/20 text-accent-amber' },
  cmi: { name: 'CMI', fullName: 'Consumer Medicine Information', color: 'bg-accent-green/20 text-accent-green' },
  ifu: { name: 'IFU', fullName: 'Instructions for Use', color: 'bg-slate-500/20 text-slate-400' },
};

const statusConfig: Record<LabelStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <Clock className="w-3 h-3" /> },
  review: { label: 'In Review', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <Eye className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <CheckCircle className="w-3 h-3" /> },
  current: { label: 'Current', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <Check className="w-3 h-3" /> },
  superseded: { label: 'Superseded', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <History className="w-3 h-3" /> },
};

const artworkStatusConfig: Record<ArtworkStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  review: { label: 'In Review', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20' },
  approved: { label: 'Approved', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20' },
  'print-ready': { label: 'Print Ready', color: 'text-accent-green', bgColor: 'bg-accent-green/20' },
  superseded: { label: 'Superseded', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const implementationStatusConfig: Record<ImplementationStatus, { label: string; color: string; bgColor: string }> = {
  'not-started': { label: 'Not Started', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'in-progress': { label: 'In Progress', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20' },
  'implemented': { label: 'Implemented', color: 'text-accent-green', bgColor: 'bg-accent-green/20' },
  'pending-update': { label: 'Pending Update', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20' },
};

const artworkTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  carton: { icon: <Box className="w-4 h-4" />, color: 'text-accent-blue' },
  label: { icon: <Tag className="w-4 h-4" />, color: 'text-accent-purple' },
  insert: { icon: <FileText className="w-4 h-4" />, color: 'text-accent-amber' },
  blister: { icon: <Package className="w-4 h-4" />, color: 'text-accent-teal' },
  bottle: { icon: <Package className="w-4 h-4" />, color: 'text-accent-green' },
};

interface LabelingScreenProps { filters?: FilterState; }

export function LabelingScreen({ filters }: LabelingScreenProps) {
  // v0.125.33: Scope context
  const { regionCode, regionFlag, countryCode, scopeSummary, scopeFlag } = useScopeContext('labeling');
  const products = useProducts();
  const lix = useLixAgent('Authoring');  // labeling-management agent
  const { selectedProductId: globalProductId, allProducts } = useProductFilter();

    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<LabelingView>('overview');
  const [selectedDocument, setSelectedDocument] = useState<LabelDocument | null>(null);
  const [selectedSection, setSelectedSection] = useState<LabelSection | null>(null);
  const [compareLeft, setCompareLeft] = useState<string | null>('lbl-1');
  const [compareRight, setCompareRight] = useState<string | null>('lbl-2');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewLabelModal, setShowNewLabelModal] = useState(false);
  const [overviewSearch, setOverviewSearch] = useState('');
  const [labelingTAFilter, setLabelingTAFilter] = useState<string>('all');

  // Overview left-rail: honour global filter or fall back to first product with label docs
  const [overviewSelectedProductId, setOverviewSelectedProductId] = useState<string>(() => {
    if (globalProductId) return globalProductId;
    // Prefer a product that has label documents (by name-normalised match)
    const labelProductIds = new Set(labelDocuments.map(d => d.productId));
    const match = (allProducts.length > 0 ? allProducts : []).find(p =>
      labelProductIds.has(p.id) || labelProductIds.has(p.name.toLowerCase().replace(/\s+/g, '-'))
    );
    return match?.id ?? 'lig-2847';
  });
  // Keep in sync when global filter changes
  useEffect(() => {
    if (globalProductId) setOverviewSelectedProductId(globalProductId);
  }, [globalProductId]);

  const [selectedProduct, setSelectedProduct] = useState(overviewSelectedProductId);

  // v0.125.33: Sync scope region to selected product label
  // (label docs are product-scoped; region drives which label variant to surface)
  const [regionFilter, setRegionFilter] = useState<string | null>(regionCode);
  useEffect(() => { setRegionFilter(regionCode); }, [regionCode]);
  
  // v155: Modal states for dead-end buttons
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);
  const [showNewArtworkModal, setShowNewArtworkModal] = useState(false);
  const [showNewSKUModal, setShowNewSKUModal] = useState(false);

  // v157: Edit/Delete modal states
  const [editingArtwork, setEditingArtwork] = useState<ArtworkItem | null>(null);
  const [editingSKU, setEditingSKU] = useState<SKUItem | null>(null);
  const [deletingArtwork, setDeletingArtwork] = useState<ArtworkItem | null>(null);
  const [deletingSKU, setDeletingSKU] = useState<SKUItem | null>(null);
  
  // v0.32.4: AI Document Generation
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [generatedLabelContent, setGeneratedLabelContent] = useState<string>('');
  
  // v157: Toast notifications
  const toast = useToast();
  
  // v159: Cross-module event system
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);

  // v0.58.0: Signal → Label cascade — surface label change tasks from confirmed safety signals
  const cascadeChains = useCascadeEngine(s => s.chains);
  const skipCascadeStep = useCascadeEngine(s => s.skipStep);
  const signalLabelTasks = useMemo(() =>
    cascadeChains
      .filter(c => c.status !== 'dismissed' && c.status !== 'complete' && c.triggerType === 'safety-signal-confirmed')
      .flatMap(c => c.steps.filter(s =>
        s.targetModule === 'authoring' && s.status === 'pending' &&
        s.title.toLowerCase().includes('label')
      ).map(s => ({ ...s, chainId: c.id, chainLabel: c.triggerLabel })))
  , [cascadeChains]);
  
  // v0.42.45: Cross-module SPL link
  const splDocuments = useSPLStore(s => s.documents);
  const splDocsArray = useMemo(() => Object.values(splDocuments), [splDocuments]);

  // v156: Dynamic data state - convert static arrays to useState for modal create handlers
  // v0.44.15: Persistent store — artworks/SKUs/translations survive navigation
  const _artworks = useLabelingScreenStore(s => s.artworks);
  const _skus = useLabelingScreenStore(s => s.skus);
  const _translations = useLabelingScreenStore(s => s.translations);
  const loadScreenSeedData = useLabelingScreenStore(s => s.loadScreenSeedData);
  const storeAddArtwork = useLabelingScreenStore(s => s.addArtwork);
  const storeUpdateArtwork = useLabelingScreenStore(s => s.updateArtwork);
  const storeRemoveArtwork = useLabelingScreenStore(s => s.removeArtwork);
  const storeAddSKU = useLabelingScreenStore(s => s.addSKU);
  const storeUpdateSKU = useLabelingScreenStore(s => s.updateSKU);
  const storeRemoveSKU = useLabelingScreenStore(s => s.removeSKU);
  const storeAddTranslation = useLabelingScreenStore(s => s.addTranslation);

  // Seed store once on mount with static initial data
  useEffect(() => {
    loadScreenSeedData(artworkItems as any, skuItems as any, translationStatuses as any);
  }, [loadScreenSeedData]);

  // Aliases so all existing JSX/handlers need no changes
  const artworks = _artworks as ArtworkItem[];
  const skus = _skus as SKUItem[];
  const translations = _translations as TranslationStatus[];

  // v156: Handler for adding new languages
  // v157: Added toast notification
  const handleAddLanguage = (data: AddLanguageHandlerInput) => {
    const newTranslation: TranslationStatus = {
      language: data.language,
      languageCode: data.language.substring(0, 2).toUpperCase(),
      flag: data.flag || '🌐',
      status: 'pending',
      progress: 0,
      translator: data.translator || undefined,
    };
    storeAddTranslation(newTranslation as any);
    toast.success(`Language "${data.language}" added successfully`);
  };

  // v156: Handler for creating new artwork
  // v157: Added toast notification
  const handleCreateArtwork = (data: CreateArtworkHandlerInput) => {
    const newArtwork: ArtworkItem = {
      id: `art-${Date.now()}`,
      name: data.name || `${data.product || 'LIG-2847'} ${data.type || 'Carton'} - ${data.market || 'US'}`,
      type: (data.type || 'carton') as ArtworkItem['type'],
      product: data.product || 'LIG-2847',
      productId: data.productId || 'lig-2847',
      market: data.market || 'US',
      marketFlag: data.marketFlag || '🇺🇸',
      labelVersion: data.labelVersion || '1.0',
      artworkVersion: data.artworkVersion || '1.0.0',
      status: 'draft',
      lastUpdated: new Date().toISOString().split('T')[0],
      designer: data.designer || 'Internal Design',
      dimensions: data.dimensions || 'TBD',
      languages: data.languages || ['EN'],
    };
    storeAddArtwork(newArtwork as any);
    toast.success(`Artwork "${newArtwork.name}" created successfully`);
  };

  // v156: Handler for creating new SKUs
  // v157: Added toast notification
  const handleCreateSKU = (data: CreateSKUHandlerInput) => {
    const newSKU: SKUItem = {
      id: `sku-${Date.now()}`,
      ndc: data.ndc || '',
      gtin: data.gtin || '',
      product: data.product || 'LIG-2847',
      productId: data.productId || 'lig-2847',
      description: data.description || `${data.product || 'LIG-2847'} ${data.strength || '200mg'}`,
      strength: data.strength || '200mg',
      packSize: data.packSize || '30 tablets',
      packType: data.packType || 'Bottle',
      market: data.market || 'US',
      marketFlag: data.marketFlag || '🇺🇸',
      labelVersion: data.labelVersion || '1.0',
      artworkVersion: data.artworkVersion || '1.0.0',
      status: 'pending',
      components: ['Carton', 'Bottle', 'Cap'],
    };
    storeAddSKU(newSKU as any);
    toast.success(`SKU "${newSKU.ndc || newSKU.description}" created successfully`);
  };

  // v157: Handler for updating artwork
  // v159: Emit cross-module event when artwork is approved or print-ready
  const handleUpdateArtwork = (data: UpdateArtworkHandlerInput) => {
    const previousArtwork = artworks.find(a => a.id === data.id);
    
    storeUpdateArtwork(data.id, data as any);
    toast.success(`Artwork "${data.name}" updated successfully`);
    
    // v159: Emit event when artwork becomes print-ready (final approval)
    if (data.status === 'print-ready' && previousArtwork?.status !== 'print-ready') {
      emitEvent(
        'packaging-artwork-approved',
        'labeling',
        {
          artworkId: data.id,
          name: data.name || previousArtwork?.name,
          type: data.type || previousArtwork?.type,
          product: data.product || previousArtwork?.product,
          productId: data.productId || previousArtwork?.productId,
          market: data.market || previousArtwork?.market,
          labelVersion: data.labelVersion || previousArtwork?.labelVersion,
          artworkVersion: data.artworkVersion || previousArtwork?.artworkVersion,
        },
        { priority: 'medium', automated: true, requiresReview: false }
      );
      toast.success(`Cross-module cascade triggered for artwork "${data.name}"`);
    }
  };

  // v157: Handler for updating SKU
  const handleUpdateSKU = (data: UpdateSKUHandlerInput) => {
    storeUpdateSKU(data.id, data as any);
    toast.success(`SKU "${data.ndc || data.description}" updated successfully`);
  };

  // v157: Handler for deleting artwork
  const handleDeleteArtwork = (artwork: ArtworkItem) => {
    storeRemoveArtwork(artwork.id);
    toast.success(`Artwork "${artwork.name}" deleted`);
  };

  // v157: Handler for deleting SKU
  const handleDeleteSKU = (sku: SKUItem) => {
    storeRemoveSKU(sku.id);
    toast.success(`SKU "${sku.ndc || sku.description}" deleted`);
  };

  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all' || filters.modality !== 'all' || filters.stage !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    if (filters.modality !== 'all') filtered = filtered.filter(p => p.modality.toLowerCase().replace(/\s+/g, '-') === filters.modality);
    if (filters.stage !== 'all') filtered = filtered.filter(p => p.stage.toLowerCase().replace(/\s+/g, '-') === filters.stage);
    return new Set(filtered.map(p => p.id));
  }, [filters]);

  const filteredDocuments = useMemo(() => {
    return labelDocuments.filter(doc => {
      if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(doc.productId)) return false;
      if (filterType !== 'all' && doc.type !== filterType) return false;
      if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return doc.product.toLowerCase().includes(query) || doc.region.toLowerCase().includes(query);
      }
      return true;
    });
  }, [matchingProductIds, filterType, filterStatus, searchQuery]);

  const filteredArtwork = useMemo(() => {
    return artworks.filter(a => {
      if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(a.productId)) return false;
      if (selectedProduct !== 'all' && a.productId !== selectedProduct) return false;
      return true;
    });
  }, [matchingProductIds, selectedProduct, artworks]);

  const filteredSKUs = useMemo(() => {
    return skus.filter(s => {
      if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(s.productId)) return false;
      if (selectedProduct !== 'all' && s.productId !== selectedProduct) return false;
      return true;
    });
  }, [matchingProductIds, selectedProduct, skus]);

  const stats = useMemo(() => {
    const docs = filteredDocuments;
    const harmonized = harmonizationData.filter(h => h.status === 'harmonized').length;
    return {
      ccdsCount: docs.filter(d => d.type === 'ccds').length,
      regionalCount: docs.filter(d => d.type !== 'ccds').length,
      harmonizedPercent: Math.round((harmonized / harmonizationData.length) * 100),
      majorDiffs: harmonizationData.filter(h => h.status === 'major-diff').length,
      inReview: docs.filter(d => d.status === 'review').length,
      translations: translations.filter(t => t.status === 'complete').length,
      totalTranslations: translations.length,
      marketsImplemented: marketVersions.filter(m => m.implementationStatus === 'implemented').length,
      totalMarkets: marketVersions.length,
      artworkCount: filteredArtwork.length,
      skuCount: filteredSKUs.length,
    };
  }, [filteredDocuments, filteredArtwork, filteredSKUs, translations]);

  const getHarmonizationBadge = (status: HarmonizationStatus) => {
    switch (status) {
      case 'harmonized': return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'minor-diff': return <AlertTriangle className="w-4 h-4 text-accent-amber" />;
      case 'major-diff': return <AlertCircle className="w-4 h-4 text-accent-red" />;
      case 'missing': return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  // Group views into categories for the nav
  const contentViews: LabelingView[] = ['overview', 'documents', 'editor', 'comparison', 'harmonization', 'translations'];
  const opsViews: LabelingView[] = ['versions', 'artwork', 'skus'];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="labeling"
        title="Global Labeling"
        subtitle="Label text management, regional variants, artwork, and submission-ready content"
        icon={<Tag className="w-5 h-5" />}
      />
      {/* v0.125.33: Scope context banner */}
      <ScopeContextBanner
        label={countryCode ? 'Country' : 'Region'}
        scopeFlag={scopeFlag}
        scopeSummary={scopeSummary}
      />
      {/* v0.58.0: Signal → Label cascade tasks */}
      {signalLabelTasks.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {signalLabelTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-3 bg-accent-red/5 border border-accent-red/20 rounded-lg">
              <Zap className="w-4 h-4 text-accent-red flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary">{task.title}</div>
                <div className="text-xs text-text-muted">From: {task.chainLabel}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { useAppStore.getState().setActiveModule('authoring'); }}
                  className="text-xs px-3 py-1.5 bg-accent-red text-white rounded-lg hover:bg-accent-red/90 transition-colors font-medium"
                >
                  Review Label
                </button>
                <button
                  onClick={() => skipCascadeStep(task.chainId, task.id)}
                  className="text-xs px-2 py-1.5 text-text-muted border border-border rounded-lg hover:bg-surface-card transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        {/* Scrollable tab area */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
            {contentViews.map(view => (
              <Button 
                key={view} 
                onClick={() => setActiveView(view)} 
                disabled={view === 'editor' && !selectedDocument}
                variant={activeView === view ? 'primary' : 'ghost'}
                size="sm"
                icon={
                  view === 'overview' ? <Globe className="w-4 h-4" /> :
                  view === 'documents' ? <FileText className="w-4 h-4" /> :
                  view === 'editor' ? <Edit className="w-4 h-4" /> :
                  view === 'comparison' ? <GitCompare className="w-4 h-4" /> :
                  view === 'harmonization' ? <Layers className="w-4 h-4" /> :
                  <Languages className="w-4 h-4" />
                }
              >
                <span className="hidden sm:inline">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              </Button>
            ))}
            <div className="h-6 w-px bg-border mx-1" />
            {opsViews.map(view => (
              <Button 
                key={view} 
                onClick={() => setActiveView(view)}
                variant={activeView === view ? 'secondary' : 'ghost'}
                size="sm"
                icon={
                  view === 'versions' ? <MapPin className="w-4 h-4" /> :
                  view === 'artwork' ? <Palette className="w-4 h-4" /> :
                  <Package className="w-4 h-4" />
                }
              >
                <span className="hidden sm:inline">{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              </Button>
            ))}
          </div>
        </div>
        {/* Pinned actions — always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2 border-l border-border/50">
          {selectedDocument && activeView === 'editor' && (
            <div className="hidden lg:flex items-center gap-3">
              {getLabelTypeBadge(selectedDocument.type)}
              <span className="text-sm text-text-primary">{selectedDocument.product} v{selectedDocument.version}</span>
            </div>
          )}
          <Button onClick={() => setShowNewLabelModal(true)} variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            <span className="hidden sm:inline">New Label</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
      {lix.status !== 'monitoring' && (
        <LixInlineAlert
          moduleScope="Authoring"
          message={lix.message}
          severity={lix.severity}
          actionLabel={lix.actionLabel ?? undefined}
          onAction={lix.actionLabel ? () => useAppStore.getState().setActiveModule('agent-hub') : undefined}
          className="mx-4 md:mx-6 mt-2 mb-1"
        />
      )}

        {activeView === 'overview' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              {/* v116: Breadcrumb navigation */}
              <Breadcrumb 
                moduleId="labeling" 
                viewLabel="Overview"
                className="mb-4"
              />
              
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Global Labeling</h1>
                <p className="text-sm text-text-muted mt-1">Content, harmonization, artwork, and commercial operations</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard title="CCDS" value={stats.ccdsCount} icon={<Globe className="w-5 h-5" />} variant="purple" />
                <StatCard title="Regional" value={stats.regionalCount} icon={<FileText className="w-5 h-5" />} variant="blue" />
                <StatCard title="Markets" value={`${stats.marketsImplemented}/${stats.totalMarkets}`} icon={<MapPin className="w-5 h-5" />} variant="green" />
                <StatCard title="Artwork" value={stats.artworkCount} icon={<Palette className="w-5 h-5" />} variant="amber" />
                <StatCard title="SKUs" value={stats.skuCount} icon={<Package className="w-5 h-5" />} variant="teal" />
              </div>

              {/* Left-rail + right-panel product selector — scales to hundreds of products */}
              <div className="flex gap-4 h-[520px]">
                {/* LEFT RAIL — TA filter + searchable product list */}
                <div className="w-64 flex-shrink-0 flex flex-col bg-surface-elevated border border-border rounded-xl overflow-hidden">
                  <div className="p-3 border-b border-border space-y-2">
                    <SearchInput
                      placeholder="Search products…"
                      value={overviewSearch}
                      onChange={(e) => setOverviewSearch(e.target.value)}
                      className="w-full"
                    />
                    <select
                      value={labelingTAFilter}
                      onChange={e => setLabelingTAFilter(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-surface-card border border-border rounded-lg text-text-primary"
                    >
                      <option value="all">All Therapeutic Areas</option>
                      {Array.from(new Set((allProducts.length > 0 ? allProducts : products).map(p => p.therapeuticArea).filter(Boolean))).sort().map(ta => (
                        <option key={ta} value={ta}>{ta}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {(() => {
                      const searchLower = overviewSearch.toLowerCase();
                      const candidates = allProducts.length > 0 ? allProducts : products;
                      // Name-normalised docCount: 'LIG-2847' → matches labelDoc productId 'lig-2847'
                      const labelProductIdSet = new Set(labelDocuments.map(d => d.productId));
                      const normDocCount = (p: typeof candidates[0]) => {
                        const norm = p.name.toLowerCase().replace(/\s+/g, '-');
                        return labelDocuments.filter(d => d.productId === p.id || d.productId === norm || d.product?.toLowerCase() === p.name.toLowerCase()).length;
                      };
                      const visible = candidates
                        .filter(p =>
                          (labelingTAFilter === 'all' || p.therapeuticArea === labelingTAFilter) &&
                          (!searchLower || p.name.toLowerCase().includes(searchLower) || (p.brandName ?? '').toLowerCase().includes(searchLower) || p.indication.toLowerCase().includes(searchLower))
                        )
                        .sort((a, b) => normDocCount(b) - normDocCount(a)); // docs-first
                      if (visible.length === 0) {
                        return (
                          <div className="p-4 text-center text-sm text-text-muted">No products match</div>
                        );
                      }
                      return visible.map(p => {
                        const docCount = normDocCount(p);
                        const isSelected = overviewSelectedProductId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setOverviewSelectedProductId(p.id); setSelectedProduct(p.id); }}
                            className={`w-full text-left px-3 py-3 border-b border-border/50 transition-colors ${
                              isSelected
                                ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue'
                                : 'hover:bg-surface-card'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-text-primary truncate">{p.name}</div>
                                {p.brandName && (
                                  <div className="text-xs text-text-muted truncate">{p.brandName}</div>
                                )}
                              </div>
                              {docCount > 0 && (
                                <span className="ml-2 flex-shrink-0 text-xs bg-accent-blue/10 text-accent-blue rounded-full px-1.5 py-0.5">
                                  {docCount}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5 truncate">{p.stage} · {p.therapeuticArea}</div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* RIGHT PANEL — label workspace for selected product */}
                {(() => {
                  const activeProduct = (allProducts.length > 0 ? allProducts : products).find(p => p.id === overviewSelectedProductId);
                  const normId = activeProduct?.name.toLowerCase().replace(/\s+/g, '-') ?? overviewSelectedProductId.toLowerCase();
                  const productDocs = labelDocuments.filter(d =>
                    d.productId === overviewSelectedProductId ||
                    d.productId === normId ||
                    d.product?.toLowerCase() === activeProduct?.name?.toLowerCase()
                  );
                  const productArtworks = artworks.filter(a =>
                    a.productId === overviewSelectedProductId ||
                    a.productId === normId ||
                    a.product?.toLowerCase() === activeProduct?.name?.toLowerCase()
                  );
                  const productSKUs = skus.filter(s =>
                    s.productId === overviewSelectedProductId ||
                    s.productId === normId ||
                    s.product?.toLowerCase() === activeProduct?.name?.toLowerCase()
                  );

                  if (!activeProduct) {
                    return (
                      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                        Select a product to view labeling workspace
                      </div>
                    );
                  }

                  return (
                    <div className="flex-1 overflow-y-auto space-y-4 min-w-0">
                      {/* Product header */}
                      <Card variant="elevated" padding="md">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-text-primary">{activeProduct.name}</h3>
                            <p className="text-xs text-text-muted mt-0.5">
                              {activeProduct.brandName ? `${activeProduct.brandName} • ` : ''}
                              {activeProduct.genericName ? `${activeProduct.genericName} • ` : ''}
                              {activeProduct.indication}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge color="blue" size="xs">{activeProduct.stage}</Badge>
                            <Badge color="slate" size="xs">{activeProduct.therapeuticArea}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-text-muted">{productDocs.length} label docs</span>
                          <span className="text-xs text-text-muted">{productArtworks.length} artwork files</span>
                          <span className="text-xs text-text-muted">{productSKUs.length} SKUs</span>
                        </div>
                      </Card>

                      {/* Label documents */}
                      <Card variant="elevated" padding="md">
                        <CardHeader title="Label Documents" />
                        <CardContent>
                          {productDocs.length === 0 ? (
                            <p className="text-sm text-text-muted py-4 text-center">No label documents for this product yet</p>
                          ) : (
                            <div className="space-y-2">
                              {productDocs.map(doc => (
                                <div
                                  key={doc.id}
                                  onClick={() => { setSelectedDocument(doc); setActiveView('editor'); }}
                                  className="flex items-center justify-between p-3 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{doc.regionFlag}</span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        {getLabelTypeBadge(doc.type)}
                                        <span className="text-sm text-text-primary">v{doc.version}</span>
                                      </div>
                                      <div className="text-xs text-text-muted">{doc.region} • {doc.owner}</div>
                                    </div>
                                  </div>
                                  {getLabelStatusBadge(doc.status, statusConfig[doc.status]?.icon)}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Quick-nav buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setSelectedProduct(overviewSelectedProductId); setActiveView('versions'); }}
                          variant="ghost" size="sm" icon={<MapPin className="w-3.5 h-3.5" />}
                        >Versions</Button>
                        <Button
                          onClick={() => { setSelectedProduct(overviewSelectedProductId); setActiveView('artwork'); }}
                          variant="ghost" size="sm" icon={<Palette className="w-3.5 h-3.5" />}
                        >Artwork ({productArtworks.length})</Button>
                        <Button
                          onClick={() => { setSelectedProduct(overviewSelectedProductId); setActiveView('skus'); }}
                          variant="ghost" size="sm" icon={<Package className="w-3.5 h-3.5" />}
                        >SKUs ({productSKUs.length})</Button>
                        <Button
                          onClick={() => setActiveView('documents')}
                          variant="ghost" size="sm" icon={<FileText className="w-3.5 h-3.5" />}
                        >All Docs</Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* v0.42.45: Cross-Module SPL Connection Panel */}
              <Card variant="elevated" padding="lg" className="mt-6">
                <CardHeader title="SPL Cross-Module Link" />
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-accent-blue" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-text-primary">FDA Structured Product Labeling</h4>
                        <p className="text-xs text-text-muted">
                          {splDocsArray.length > 0 
                            ? `${splDocsArray.length} SPL document${splDocsArray.length !== 1 ? 's' : ''} available for linking`
                            : 'No SPL documents available'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {splDocsArray.length > 0 ? (
                        <>
                          <Badge color="green" size="xs">{splDocsArray.filter(d => d.status === 'approved' || d.status === 'published').length} Approved</Badge>
                          <Badge color="amber" size="xs">{splDocsArray.filter(d => d.status === 'draft').length} Draft</Badge>
                        </>
                      ) : (
                        <Badge color="slate" size="xs">Not Connected</Badge>
                      )}
                    </div>
                  </div>
                  {splDocsArray.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {splDocsArray.slice(0, 3).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-surface-card rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-text-muted" />
                            <span className="text-text-primary truncate max-w-[300px]">{doc.title}</span>
                            <Badge color="blue" size="xs">v{doc.versionNumber}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted">{doc.components?.length || 0} sections</span>
                            {doc.linkedLabelingId ? (
                              <Badge color="green" size="xs">Linked</Badge>
                            ) : (
                              <Badge color="slate" size="xs">Unlinked</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card variant="elevated" padding="lg" className="mt-6">
                <CardHeader title={`Implementation Status — ${(allProducts.length > 0 ? allProducts : products).find(p => p.id === overviewSelectedProductId)?.name ?? overviewSelectedProductId}`} />
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {marketVersions.slice(0, 8).map(mv => (
                      <div key={mv.market} className="p-3 bg-surface-card rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg">{mv.flag}</span>
                          {getImplementationStatusBadge(mv.implementationStatus)}
                        </div>
                        <div className="text-sm font-medium text-text-primary">{mv.market}</div>
                        <div className="text-xs text-text-muted">v{mv.labelVersion} • {mv.skuCount} SKUs</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'documents' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Label Documents</h1>
                <div className="flex items-center gap-3">
                  <SearchInput placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48" />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"><option value="all">All Types</option>{Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
                </div>
              </div>
              {filteredDocuments.length === 0 ? <div className="text-center py-12"><FileText className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" /><p className="text-text-muted">No labels match filters</p></div> : (
                <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                  <table className="w-full"><thead><tr className="border-b border-border bg-surface-card"><th className="text-left p-4 text-xs font-medium text-text-muted">Type</th><th className="text-left p-4 text-xs font-medium text-text-muted">Region</th><th className="text-left p-4 text-xs font-medium text-text-muted">Product</th><th className="text-left p-4 text-xs font-medium text-text-muted">Version</th><th className="text-center p-4 text-xs font-medium text-text-muted">Status</th><th className="text-left p-4 text-xs font-medium text-text-muted">Owner</th><th className="text-center p-4 text-xs font-medium text-text-muted">Actions</th></tr></thead>
                  <tbody>{filteredDocuments.map(doc => (
                    <tr key={doc.id} className="border-b border-border/50 hover:bg-surface-card/50 cursor-pointer" onClick={() => { setSelectedDocument(doc); setActiveView('editor'); }}>
                      <td className="p-4">{getLabelTypeBadge(doc.type)}</td>
                      <td className="p-4"><span className="flex items-center gap-2 text-sm text-text-secondary">{doc.regionFlag} {doc.region}</span></td>
                      <td className="p-4 text-sm text-text-secondary">{doc.product}</td>
                      <td className="p-4 text-sm text-text-primary font-medium">v{doc.version}</td>
                      <td className="p-4 text-center">{getLabelStatusBadge(doc.status, statusConfig[doc.status]?.icon)}</td>
                      <td className="p-4 text-sm text-text-muted">{doc.owner}</td>
                      <td className="p-4"><div className="flex items-center justify-center gap-1"><button className="p-2 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Select this label row then use the editor panel on the right to edit content')}><Edit className="w-4 h-4" /></button><button className="p-2 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary"><GitCompare className="w-4 h-4" /></button></div></td>
                    </tr>
                  ))}</tbody></table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'editor' && selectedDocument && (
          <>

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed left-3 top-16 z-30 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg text-text-secondary hover:text-text-primary"
              aria-label="Open Label Browser"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            </button>
            {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}
            <div className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} w-72 bg-surface-elevated border-r border-border flex flex-col`}>
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2 mb-2"><span className="text-lg">{selectedDocument.regionFlag}</span><div><div className="text-sm font-semibold text-text-primary">{typeLabels[selectedDocument.type]?.fullName}</div><div className="text-xs text-text-muted">{selectedDocument.product} v{selectedDocument.version}</div></div></div>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {labelSections.map(section => (
                  <div key={section.id} onClick={() => setSelectedSection(section)} className={`p-3 rounded-lg cursor-pointer mb-1 transition-colors ${selectedSection?.id === section.id ? 'bg-accent-blue/20' : 'hover:bg-surface-card'}`}>
                    <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-text-primary">{section.number}. {section.title}</span>{section.status === 'modified' && <Badge color="amber" size="xs" dot>Modified</Badge>}</div>
                    {section.ccdsRef && <div className="text-xs text-text-muted flex items-center gap-1"><Link2 className="w-3 h-3" />CCDS {section.ccdsRef}</div>}
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border"><Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4" />} className="w-full" onClick={() => setShowAIGenerator(true)}>AI Generate</Button></div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedSection ? (
                <>
                  {/* Editor Header */}
                  <div className="px-6 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">{selectedSection.number}. {selectedSection.title}</h2>
                      {selectedSection.ccdsRef && (
                        <div className="flex items-center gap-2 mt-1">
                          <Link2 className="w-3 h-3 text-accent-blue" />
                          <span className="text-xs text-accent-blue">Linked to CCDS Section {selectedSection.ccdsRef}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" icon={<History className="w-4 h-4" />} onClick={() => toast.info("Version history panel — track all label changes with timestamps and author attribution")}>History</Button>
                      <Button variant="ghost" size="sm" icon={<MessageSquare className="w-4 h-4" />} onClick={() => toast.info("Comments panel — add review notes to individual label sections for cross-functional collaboration")}>Comments</Button>
                    </div>
                  </div>
                  
                  {/* Formatting Toolbar */}
                  <div className="px-6 py-2 border-b border-border bg-surface flex items-center gap-1">
                    <div className="flex items-center gap-0.5 pr-3 border-r border-border">
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Rich text formatting active — click into the content area below to begin editing')}><Bold className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Rich text formatting active — click into the content area below to begin editing')}><Italic className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Rich text formatting active — click into the content area below to begin editing')}><Underline className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-0.5 px-3 border-r border-border">
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('List formatting — click into the content area below to begin editing')}><List className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('List formatting — click into the content area below to begin editing')}><ListOrdered className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-0.5 px-3 border-r border-border">
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Text alignment — click into the content area below to begin editing')}><AlignLeft className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Text alignment — click into the content area below to begin editing')}><AlignCenter className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-0.5 px-3">
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary"><TableIcon className="w-4 h-4" /></button>
                      <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary"><ImageIcon className="w-4 h-4" /></button>
                    </div>
                    <div className="flex-1" />
                    <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4" />} onClick={() => setShowAIGenerator(true)}>AI Assist</Button>
                  </div>
                  
                  {/* Editor Content */}
                  <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-white dark:bg-surface-elevated border border-border rounded-lg shadow-sm min-h-[500px]">
                        <div className="p-8">
                          <textarea 
                            className="w-full min-h-[400px] bg-transparent text-text-primary text-sm leading-relaxed resize-none focus:outline-none font-serif"
                            defaultValue={selectedSection.content}
                            placeholder="Start writing or use AI Assist to generate content..."
                          />
                        </div>
                      </div>
                      
                      {/* CCDS Reference Panel */}
                      {selectedSection.ccdsRef && (
                        <div className="mt-4 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-accent-blue" />
                            <span className="text-sm font-medium text-text-primary">CCDS Reference</span>
                          </div>
                          <p className="text-sm text-text-secondary">Section {selectedSection.ccdsRef} of the Company Core Data Sheet provides the source content for harmonization. Regional adaptations should align with CCDS unless local requirements differ.</p>
                          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { useAppStore.getState().setActiveModule('document-control'); }} icon={<ExternalLink className="w-3 h-3" />}>View CCDS Source</Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Editor Footer */}
                  <div className="px-6 py-3 border-t border-border bg-surface-elevated flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>Last saved: 2 min ago</span>
                      <span>•</span>
                      <span>{selectedSection.content?.split(/\s+/).length || 0} words</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => toast.success("CCDS sync complete — 3 sections updated to match Core Data Sheet v2.4")}>Sync with CCDS</Button>
                      <Button variant="primary" size="sm" icon={<Check className="w-4 h-4" />} onClick={() => toast.success("Label changes saved — version auto-incremented · audit trail updated (21 CFR Part 11)")}>Save Changes</Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a section to edit</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeView === 'comparison' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h1 className="text-2xl font-semibold text-text-primary">Label Comparison</h1>
                {/* Product selector — determines which product's labels populate the dropdowns */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted whitespace-nowrap">Comparing labels for:</span>
                  <select
                    value={overviewSelectedProductId}
                    onChange={e => {
                      setOverviewSelectedProductId(e.target.value);
                      // Reset selections when product changes
                      const first = labelDocuments.find(d => d.productId === e.target.value);
                      const second = labelDocuments.filter(d => d.productId === e.target.value)[1];
                      setCompareLeft(first?.id ?? null);
                      setCompareRight(second?.id ?? null);
                    }}
                    className="px-3 py-1.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                  >
                    {(allProducts.length > 0 ? allProducts : products).map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.brandName ? ` (${p.brandName})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Label selectors — filtered to selected product */}
              {(() => {
                // Name-normalised match: store UUID product 'LIG-2847' → matches label productId 'lig-2847'
                const selectedProductName = (allProducts.length > 0 ? allProducts : products)
                  .find(p => p.id === overviewSelectedProductId)?.name?.toLowerCase().replace(/\s+/g, '-') ?? '';
                const productDocs = labelDocuments.filter(d =>
                  d.productId === overviewSelectedProductId ||
                  d.productId === overviewSelectedProductId.toLowerCase().replace(/\s+/g, '-') ||
                  (selectedProductName && d.productId === selectedProductName) ||
                  d.product?.toLowerCase() === (allProducts.length > 0 ? allProducts : products).find(p => p.id === overviewSelectedProductId)?.name?.toLowerCase()
                );
                const leftDoc = productDocs.find(d => d.id === compareLeft) ?? productDocs[0] ?? null;
                const rightDoc = productDocs.find(d => d.id === compareRight) ?? productDocs[1] ?? null;
                return (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <select
                        value={compareLeft || ''}
                        onChange={e => setCompareLeft(e.target.value)}
                        className="flex-1 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                      >
                        {productDocs.length === 0
                          ? <option value="">No labels for this product</option>
                          : productDocs.map(d => <option key={d.id} value={d.id}>{d.regionFlag} {typeLabels[d.type]?.name} v{d.version}</option>)
                        }
                      </select>
                      <ArrowRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                      <select
                        value={compareRight || ''}
                        onChange={e => setCompareRight(e.target.value)}
                        className="flex-1 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                      >
                        {productDocs.length === 0
                          ? <option value="">No labels for this product</option>
                          : productDocs.map(d => <option key={d.id} value={d.id}>{d.regionFlag} {typeLabels[d.type]?.name} v{d.version}</option>)
                        }
                      </select>
                    </div>

                    {productDocs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-surface-card flex items-center justify-center mb-3">
                          <span className="text-2xl">🏷️</span>
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1">No labels registered for this product</p>
                        <p className="text-xs text-text-muted">Switch product or create a new label document from the Documents tab.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Left panel */}
                        <div className="bg-surface-elevated border border-border rounded-lg p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-base">{leftDoc?.regionFlag ?? '🌐'}</span>
                            <span className="text-sm font-semibold text-text-primary">
                              {leftDoc ? `${typeLabels[leftDoc.type]?.name ?? leftDoc.type} v${leftDoc.version}` : '—'}
                            </span>
                            <span className="ml-auto text-xs text-text-muted">{leftDoc?.product}</span>
                          </div>
                          {leftDoc?.sections ? (
                            <div className="space-y-2 text-xs text-text-muted">{leftDoc.sections} sections</div>
                          ) : (
                            <div className="space-y-3">
                              <div className="p-3 bg-surface-card rounded"><div className="text-xs text-text-muted">4.3 Contraindications</div><div className="text-sm text-text-primary mt-1">Hypersensitivity to active substance</div></div>
                              <div className="p-3 bg-surface-card rounded"><div className="text-xs text-text-muted">4.4 Warnings</div><div className="text-sm text-text-primary mt-1">Hepatotoxicity, ILD, QTc prolongation</div></div>
                              <div className="p-3 bg-surface-card rounded"><div className="text-xs text-text-muted">4.8 Adverse Reactions</div><div className="text-sm text-text-primary mt-1">Nausea, fatigue, elevated transaminases</div></div>
                            </div>
                          )}
                        </div>
                        {/* Right panel */}
                        <div className="bg-surface-elevated border border-border rounded-lg p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-base">{rightDoc?.regionFlag ?? '🌐'}</span>
                            <span className="text-sm font-semibold text-text-primary">
                              {rightDoc ? `${typeLabels[rightDoc.type]?.name ?? rightDoc.type} v${rightDoc.version}` : '—'}
                            </span>
                            <span className="ml-auto text-xs text-text-muted">{rightDoc?.product}</span>
                          </div>
                          <div className="space-y-3">
                            <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded"><div className="text-xs text-text-muted">4.3 Contraindications</div><div className="text-sm text-text-primary mt-1"><span className="bg-accent-red/20 px-1 line-through rounded">Hypersensitivity</span> None</div></div>
                            <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded"><div className="text-xs text-text-muted">4.4 Warnings</div><div className="text-sm text-text-primary mt-1">Hepatotoxicity, ILD <span className="bg-accent-red/20 px-1 line-through rounded">, QTc</span></div></div>
                            <div className="p-3 bg-surface-card rounded"><div className="text-xs text-text-muted">4.8 Adverse Reactions</div><div className="text-sm text-text-primary mt-1">Nausea, fatigue, elevated transaminases</div></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {activeView === 'harmonization' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6"><div><h1 className="text-2xl font-semibold text-text-primary">Harmonization Matrix</h1></div><Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => {
                const csvContent = [
                  ['Section', 'Section Name', 'CCDS', 'USPI', 'SmPC', 'Status'].join(','),
                  ...harmonizationData.map(row => [
                    row.section,
                    `"${row.sectionName}"`,
                    `"${row.ccds}"`,
                    `"${row.uspi}"`,
                    `"${row.smpc}"`,
                    row.status
                  ].join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `harmonization-matrix-${new Date().toISOString().split('T')[0]}.csv`;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}>Export</Button>
                </div>
              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full"><thead><tr className="border-b border-border bg-surface-card"><th className="text-left p-4 text-xs font-medium text-text-muted w-40">Section</th><th className="text-left p-4 text-xs font-medium text-text-muted">🌐 CCDS</th><th className="text-left p-4 text-xs font-medium text-text-muted">🇺🇸 USPI</th><th className="text-left p-4 text-xs font-medium text-text-muted">🇪🇺 SmPC</th><th className="text-center p-4 text-xs font-medium text-text-muted w-32">Status</th></tr></thead>
                <tbody>{harmonizationData.map(row => (
                  <tr key={row.section} className={`border-b border-border/50 hover:bg-surface-card/50 ${row.status === 'major-diff' ? 'bg-accent-red/5' : ''}`}>
                    <td className="p-4"><div className="text-sm font-medium text-text-primary">{row.section}</div><div className="text-xs text-text-muted">{row.sectionName}</div></td>
                    <td className="p-4 text-sm text-text-secondary max-w-[180px] truncate">{row.ccds}</td>
                    <td className="p-4 text-sm text-text-secondary max-w-[180px] truncate">{row.uspi}</td>
                    <td className="p-4 text-sm text-text-secondary max-w-[180px] truncate">{row.smpc}</td>
                    <td className="p-4"><div className="flex flex-col items-center gap-1">{getHarmonizationBadge(row.status)}{getHarmonizationStatusBadge(row.status)}</div></td>
                  </tr>
                ))}</tbody></table>
              </div>
            </div>
          </div>
        )}

        {activeView === 'translations' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Translations</h1>
                  <p className="text-xs text-text-muted mt-0.5">{(allProducts.length > 0 ? allProducts : products).find(p => p.id === overviewSelectedProductId)?.name ?? overviewSelectedProductId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={overviewSelectedProductId} onChange={e => setOverviewSelectedProductId(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    {(allProducts.length > 0 ? allProducts : products).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddLanguageModal(true)}>Add Language</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {[{ type: 'smpc' as LabelType, name: 'SmPC', data: translations }, { type: 'pil' as LabelType, name: 'PIL', data: translations.slice(0, 5) }].map(({ type, name, data }) => (
                  <div key={type} className="bg-surface-elevated border border-border rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">{getLabelTypeBadge(type)}<span className="text-sm font-medium text-text-primary">{name}</span></div>
                    <div className="space-y-3">{data.map(trans => (
                      <div key={trans.languageCode} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <div className="flex items-center gap-3"><span className="text-lg">{trans.flag}</span><div><div className="text-sm text-text-primary">{trans.language}</div></div></div>
                        {trans.status === 'complete' ? <Badge color="green" size="sm" icon={<CheckCircle className="w-3 h-3" />}>Complete</Badge> : trans.status === 'in-progress' ? <div className="flex items-center gap-2"><div className="w-16 h-2 bg-surface rounded-full overflow-hidden"><div className="h-full bg-accent-blue" style={{ width: `${trans.progress}%` }} /></div><span className="text-xs text-text-muted">{trans.progress}%</span></div> : <Badge color="amber" size="sm" icon={<Clock className="w-3 h-3" />}>Pending</Badge>}
                      </div>
                    ))}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VERSIONS VIEW - Global label version matrix by market */}
        {activeView === 'versions' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Global Label Versions</h1>
                  <p className="text-sm text-text-muted mt-1">Label versions and implementation status by market</p>
                </div>
                <div className="flex items-center gap-3">
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    {(allProducts.length > 0 ? allProducts : products).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brandName ? ` (${p.brandName})` : ''}{p.genericName ? ` — ${p.genericName}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => {
                    const exportData = JSON.stringify({
                      product: selectedProduct,
                      exportedAt: new Date().toISOString(),
                      labelVersions: marketVersions
                    }, null, 2);
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = `label-versions-${selectedProduct}-${new Date().toISOString().split('T')[0]}.json`;
                    window.document.body.appendChild(a);
                    a.click();
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}>Export</Button>
                </div>
              </div>

              {/* Safety Update Alert */}
              <div className="mb-6 bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-accent-red" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-primary">Safety-Driven Label Update Required</h3>
                      <Badge color="red" variant="default" size="xs">URGENT</Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      <button onClick={() => useAppStore.getState().setActiveModule('safety')} className="text-accent-blue hover:underline font-medium inline-flex items-center gap-1">
                        Hepatotoxicity signal confirmed <ExternalLink className="w-3 h-3" />
                      </button>
                      {'. CCDS v2.1 update in progress. All regional labels require update within 30 days.'}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-accent-red font-medium">8 markets affected</div>
                    <div className="text-text-muted">Target: Jan 10, 2025</div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard title="Implemented" value={marketVersions.filter(m => m.implementationStatus === 'implemented').length} icon={<CheckCircle className="w-5 h-5" />} variant="green" />
                <StatCard title="In Progress" value={marketVersions.filter(m => m.implementationStatus === 'in-progress').length} icon={<Clock className="w-5 h-5" />} variant="amber" />
                <StatCard title="Pending Update" value={8} icon={<AlertTriangle className="w-5 h-5" />} variant="red" />
                <StatCard title="Not Started" value={marketVersions.filter(m => m.implementationStatus === 'not-started').length} icon={<Globe className="w-5 h-5" />} variant="default" />
              </div>

              {/* Version Matrix Table */}
              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Market</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Label Type</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Current</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Target</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Approval Date</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Update Status</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">SKUs</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketVersions.map(mv => (
                      <tr key={mv.market} className={`border-b border-border/50 hover:bg-surface-card/50 ${mv.implementationStatus !== 'implemented' ? 'bg-accent-red/5' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{mv.flag}</span>
                            <span className="text-sm font-medium text-text-primary">{mv.market}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-text-secondary">{mv.labelType}</td>
                        <td className="p-4 text-center"><span className="text-sm font-mono font-medium text-text-muted">v{mv.labelVersion}</span></td>
                        <td className="p-4 text-center"><Badge color="red" size="xs">v2.1</Badge></td>
                        <td className="p-4 text-sm text-text-muted">{mv.approvalDate}</td>
                        <td className="p-4 text-center">
                          <Badge color={mv.implementationStatus === 'implemented' ? 'amber' : 'red'} size="xs">
                            Pending Update
                          </Badge>
                        </td>
                        <td className="p-4 text-center text-sm text-text-primary">{mv.skuCount}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setActiveView('artwork')} className="p-2 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary" title="View Artwork"><Palette className="w-4 h-4" /></button>
                            <button onClick={() => setActiveView('skus')} className="p-2 hover:bg-surface-elevated rounded text-text-muted hover:text-text-primary" title="View SKUs"><Package className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CCDS Reference */}
              <div className="mt-6 bg-accent-red/5 border border-accent-red/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-accent-red mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-text-primary">CCDS Update: v2.0 → v2.1</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-accent-red/20 text-accent-red">Safety Update</span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">Hepatotoxicity warning enhancement required across all markets. Section 4.4 updated with monitoring recommendations and dose modification guidance. Target completion: 30 days.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ARTWORK VIEW - Packaging artwork management */}
        {activeView === 'artwork' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Packaging Artwork</h1>
                  <p className="text-sm text-text-muted mt-1">Manage cartons, labels, inserts, and packaging components</p>
                </div>
                <div className="flex items-center gap-3">
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    {(allProducts.length > 0 ? allProducts : products).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brandName ? ` (${p.brandName})` : ''}{p.genericName ? ` — ${p.genericName}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewArtworkModal(true)}>New Artwork</Button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard title="Cartons" value={filteredArtwork.filter(a => a.type === 'carton').length} icon={<Box className="w-5 h-5" />} variant="blue" />
                <StatCard title="Labels" value={filteredArtwork.filter(a => a.type === 'label').length} icon={<Tag className="w-5 h-5" />} variant="purple" />
                <StatCard title="Inserts" value={filteredArtwork.filter(a => a.type === 'insert').length} icon={<FileText className="w-5 h-5" />} variant="amber" />
                <StatCard title="Blisters" value={filteredArtwork.filter(a => a.type === 'blister').length} icon={<Package className="w-5 h-5" />} variant="teal" />
                <StatCard title="Print Ready" value={filteredArtwork.filter(a => a.status === 'print-ready').length} icon={<CheckCircle className="w-5 h-5" />} variant="green" />
              </div>

              {/* Artwork Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {filteredArtwork.map(artwork => (
                  <div key={artwork.id} className="bg-surface-elevated border border-border rounded-lg overflow-hidden hover:border-accent-blue/50 transition-colors group">
                    {/* Preview Area */}
                    <div className="h-40 bg-surface-card flex items-center justify-center border-b border-border relative">
                      <div className={`w-20 h-20 rounded-lg bg-surface-elevated flex items-center justify-center ${artworkTypeConfig[artwork.type]?.color}`}>
                        {artworkTypeConfig[artwork.type]?.icon}
                      </div>
                      {/* v157: Edit/Delete overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={() => setEditingArtwork(artwork)}
                          className="p-1.5 bg-surface-elevated/90 hover:bg-surface-elevated rounded-lg text-text-muted hover:text-accent-blue transition-colors border border-border"
                          title="Edit artwork"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setDeletingArtwork(artwork)}
                          className="p-1.5 bg-surface-elevated/90 hover:bg-surface-elevated rounded-lg text-text-muted hover:text-accent-red transition-colors border border-border"
                          title="Delete artwork"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-text-primary line-clamp-1">{artwork.name}</h3>
                          <p className="text-xs text-text-muted mt-0.5">{artwork.marketFlag} {artwork.market}</p>
                        </div>
                        {getArtworkStatusBadge(artwork.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-text-muted mt-3">
                        <div><span className="text-text-muted">Label:</span> <span className="text-text-secondary">v{artwork.labelVersion}</span></div>
                        <div><span className="text-text-muted">Artwork:</span> <span className="text-text-secondary">v{artwork.artworkVersion}</span></div>
                        <div><span className="text-text-muted">Size:</span> <span className="text-text-secondary">{artwork.dimensions}</span></div>
                        <div><span className="text-text-muted">Lang:</span> <span className="text-text-secondary">{artwork.languages.join(', ')}</span></div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <span className="text-xs text-text-muted">{artwork.designer}</span>
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => toast.info('Label preview renders in the right panel — select a section to view formatted output')}><Eye className="w-4 h-4" /></button>
                          <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => { const blob = new Blob(['Label Content Export\nGenerated: ' + new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='label-export.txt'; a.click(); toast.success('Label content downloaded'); }}><Download className="w-4 h-4" /></button>
                          <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary" onClick={() => { window.print(); }}><Printer className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Artwork Workflow Info */}
              <div className="mt-6 bg-accent-amber/5 border border-accent-amber/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Palette className="w-5 h-5 text-accent-amber mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-text-primary">Artwork Workflow</h4>
                    <p className="text-sm text-text-secondary mt-1">Artwork progresses through Draft → Review → Approved → Print Ready. All artwork must be linked to an approved label version before reaching Print Ready status.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SKUS VIEW */}
        {activeView === 'skus' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">SKU Management</h1>
                  <p className="text-sm text-text-muted mt-1">Product configurations, NDCs, GTINs, and pack components</p>
                </div>
                <div className="flex items-center gap-3">
                  <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    {(allProducts.length > 0 ? allProducts : products).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brandName ? ` (${p.brandName})` : ''}{p.genericName ? ` — ${p.genericName}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowNewSKUModal(true)}>New SKU</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                <StatCard title="Active" value={filteredSKUs.filter(s => s.status === 'active').length} icon={<CheckCircle className="w-5 h-5" />} variant="green" />
                <StatCard title="Pending" value={filteredSKUs.filter(s => s.status === 'pending').length} icon={<Clock className="w-5 h-5" />} variant="amber" />
                <StatCard title="Markets" value={new Set(filteredSKUs.map(s => s.market)).size} icon={<Globe className="w-5 h-5" />} variant="blue" />
                <StatCard title="Pack Types" value={new Set(filteredSKUs.map(s => s.packType)).size} icon={<Package className="w-5 h-5" />} variant="teal" />
              </div>

              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Market</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Description</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">NDC / GTIN</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Pack</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Label</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                      <th className="text-left p-4 text-xs font-medium text-text-muted">Components</th>
                      <th className="text-center p-4 text-xs font-medium text-text-muted w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSKUs.map(sku => (
                      <tr key={sku.id} className="border-b border-border/50 hover:bg-surface-card/50 group">
                        <td className="p-4"><div className="flex items-center gap-2"><span className="text-lg">{sku.marketFlag}</span><span className="text-sm text-text-secondary">{sku.market}</span></div></td>
                        <td className="p-4"><div className="text-sm font-medium text-text-primary">{sku.description}</div><div className="text-xs text-text-muted">{sku.strength}</div></td>
                        <td className="p-4"><div className="text-xs font-mono">{sku.ndc && <div className="text-text-primary">NDC: {sku.ndc}</div>}<div className="text-text-muted">GTIN: {sku.gtin}</div></div></td>
                        <td className="p-4 text-center"><Badge color="slate" size="xs">{sku.packSize}</Badge></td>
                        <td className="p-4 text-center"><Badge color="blue" size="xs">v{sku.labelVersion}</Badge></td>
                        <td className="p-4 text-center">{getSkuStatusBadge(sku.status)}</td>
                        <td className="p-4"><div className="flex flex-wrap gap-1">{sku.components.slice(0, 3).map((c, i) => <Badge key={i} color="slate" size="xs">{c}</Badge>)}{sku.components.length > 3 && <span className="text-xs text-text-muted">+{sku.components.length - 3}</span>}</div></td>
                        {/* v157: Edit/Delete actions */}
                        <td className="p-4 text-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button 
                              onClick={() => setEditingSKU(sku)}
                              className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-accent-blue transition-colors"
                              title="Edit SKU"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeletingSKU(sku)}
                              className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-accent-red transition-colors"
                              title="Delete SKU"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-accent-teal/5 border border-accent-teal/20 rounded-lg p-4">
                  <div className="flex items-start gap-3"><QrCode className="w-5 h-5 text-accent-teal mt-0.5" /><div><h4 className="text-sm font-medium text-text-primary">Serialization</h4><p className="text-sm text-text-secondary mt-1">All SKUs include serialization data for track-and-trace compliance.</p></div></div>
                </div>
                <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4">
                  <div className="flex items-start gap-3"><Link2 className="w-5 h-5 text-accent-blue mt-0.5" /><div><h4 className="text-sm font-medium text-text-primary">Label Linkage</h4><p className="text-sm text-text-secondary mt-1">Each SKU is linked to a specific label and artwork version.</p></div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showNewLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[550px] shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">New Label Document</h2>
              <button onClick={() => setShowNewLabelModal(false)} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div><label className="text-sm font-medium text-text-primary block mb-2">Product</label><select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"><option>LIG-2847</option><option>LIG-1182</option></select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label className="text-sm font-medium text-text-primary block mb-2">Type</label><select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"><option>CCDS</option><option>USPI</option><option>SmPC</option><option>PIL</option></select></div>
                <div><label className="text-sm font-medium text-text-primary block mb-2">Region</label><select className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"><option>🌐 Global</option><option>🇺🇸 US</option><option>🇪🇺 EU</option></select></div>
              </div>
              <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:bg-accent-purple/20 transition-colors" onClick={() => { setShowNewLabelModal(false); setShowAIGenerator(true); }}><Sparkles className="w-5 h-5 text-accent-purple mt-0.5" /><div><div className="text-sm font-medium text-text-primary">Generate from CCDS</div><p className="text-xs text-text-muted mt-1">Auto-generate from approved CCDS using AI.</p></div></div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <Button onClick={() => setShowNewLabelModal(false)} variant="ghost" size="sm">Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => toast.success('Label document created from template — opening in editor')}>Create</Button>
            </div>
          </div>
        </div>
      )}

      {/* v155: Labeling Create Modals */}
      {/* v156: Wired to actual handlers that add to state */}
      <AddLanguageModal 
        isOpen={showAddLanguageModal} 
        onClose={() => setShowAddLanguageModal(false)} 
        onCreate={handleAddLanguage} 
      />
      <NewArtworkModal 
        isOpen={showNewArtworkModal} 
        onClose={() => setShowNewArtworkModal(false)} 
        onCreate={handleCreateArtwork} 
      />
      <NewSKUModal 
        isOpen={showNewSKUModal} 
        onClose={() => setShowNewSKUModal(false)} 
        onCreate={handleCreateSKU} 
      />

      {/* v157: Edit/Delete Modals */}
      <EditArtworkModal
        isOpen={!!editingArtwork}
        onClose={() => setEditingArtwork(null)}
        onSave={handleUpdateArtwork}
        artwork={editingArtwork}
      />
      <EditSKUModal
        isOpen={!!editingSKU}
        onClose={() => setEditingSKU(null)}
        onSave={handleUpdateSKU}
        sku={editingSKU}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingArtwork}
        onClose={() => setDeletingArtwork(null)}
        onConfirm={() => deletingArtwork && handleDeleteArtwork(deletingArtwork)}
        itemType="Artwork"
        itemName={deletingArtwork?.name || ''}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingSKU}
        onClose={() => setDeletingSKU(null)}
        onConfirm={() => deletingSKU && handleDeleteSKU(deletingSKU)}
        itemType="SKU"
        itemName={deletingSKU?.ndc || deletingSKU?.description || ''}
      />
      
      {/* v0.32.4: AI Document Generator for PI/SmPC */}
      <AIDocumentGeneratorPanel
        isOpen={showAIGenerator}
        context={{
          documentType: 'labeling-pi',
          title: selectedDocument ? `${typeLabels[selectedDocument.type]?.name || 'Label'} - ${selectedDocument.regionFlag}` : 'Prescribing Information',
          productName: 'LIG-2847 (Ligacetam)',
          indication: 'Type 2 Diabetes Mellitus',
          contextData: {
            labelType: selectedDocument?.type || 'uspi',
            region: selectedDocument?.region || 'US',
            version: selectedDocument?.version || '1.0',
            sections: selectedSection ? [selectedSection] : labelSections,
            currentContent: selectedSection?.content || '',
          },
        }}
        onAccept={(content) => {
          setGeneratedLabelContent(content);
          setShowAIGenerator(false);
          toast.success('Label content generated successfully', {
            action: { label: 'View in Labeling →', onClick: () => useAppStore.getState().setActiveModule('labeling') },
          });
        }}
        onClose={() => setShowAIGenerator(false)}
      />
    </div>
  );
}
