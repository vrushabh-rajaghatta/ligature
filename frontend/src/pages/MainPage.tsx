

/**
 * Main Application Page - v160
 * 
 * Performance Optimizations:
 * - Dynamic imports for all module screens (code-splitting)
 * - Prefetch adjacent/likely modules on hover
 * - Keep visited modules mounted (instant tab switching)
 * - Centralized loading state management
 * 
 * v141 Mobile Responsive Polish:
 * - Responsive utility hooks
 * - Adaptive layouts across breakpoints
 * - Mobile-optimized demo overlays
 * 
 * v142 Final POC Validation:
 * - Demo health monitoring
 * - Enhanced error recovery
 * - Accessibility improvements
 * 
 * v143 Final Polish & Documentation:
 * - Animation utilities
 * - Enhanced empty states
 * - Production readiness tools
 * 
 * v158 Cross-Module Data Flow & Guided Scenarios:
 * - Cross-module event system for data cascades
 * - Guided scenario overlay for investor demos
 * - Preclinical → Safety → Label flow demonstration
 * 
 * v160 Activity Dashboard & Notifications:
 * - Full-page Activity Dashboard in main navigation
 * - Real-time toast notifications for cross-module events
 * - Live/Pause feed controls
 * - Enhanced cascade visibility
 * 
 * v0.25.1 Sidebar Navigation:
 * - Activated persistent left sidebar for desktop/tablet
 * - Collapsible sidebar with icon-only mode
 * - Role-filtered navigation items
 * - Industry-standard enterprise navigation pattern
 */

import { useState, useCallback, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FavoritesPanel } from '@/components/favorites/FavoritesPanel'; // v0.125.73
import { FilterBar, FilterState, defaultFilters } from '@/components/layout/FilterBar';
// v0.25.1: Responsive sidebar hook
import { useIsMobile, useIsTablet } from '@/hooks/useResponsive';
import { ModuleErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PortfolioScreenSkeleton, ActivityScreenSkeleton, HAQScreenSkeleton, SubmissionsScreenSkeleton, AuthoringScreenSkeleton, SafetyScreenSkeleton, AdminScreenSkeleton, CTMSScreenSkeleton, CMCScreenSkeleton, QualityScreenSkeleton, QMSScreenSkeleton, TMFScreenSkeleton, DocumentControlScreenSkeleton, LabelingScreenSkeleton, RegStrategyScreenSkeleton, ECTDWorkspaceScreenSkeleton, PublishingScreenSkeleton, LifecycleScreenSkeleton, MasterDataScreenSkeleton, DevelopmentScreenSkeleton, ResearchScreenSkeleton, PlanningScreenSkeleton, StudyIntelScreenSkeleton, InspectorReadinessScreenSkeleton, SubmissionsHubScreenSkeleton, PublishingCenterScreenSkeleton, ProgramDetailScreenSkeleton } from '@/components/ui/ModuleContainer';
import { AIChatAssistant } from '@/components/ai/AIChatAssistant';
import { NotificationProvider } from '@/components/notifications/NotificationSystem';
// v204d-b16: Demo system re-enabled in v0.43.2 (infinite loop fixed in v204d-b7 via individual selectors)
import { GuidedDemoOverlay } from '@/components/demo/GuidedDemoOverlay';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { CascadeBanner } from '@/components/ui/CascadeBanner';
import { ModuleId } from '@/types/core';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
// v0.45.1: Feature flag gating
import { useFeatureFlags } from '@/store/useFeatureFlags';
import { ModuleLockedScreen } from '@/components/screens/ModuleLockedScreen';
// v0.12.0: Role-based experience (wizard removed in v0.17.9 - use header dropdown)
// v0.13.11: Auth gating
import { useAuth } from '@/hooks/useAuth';
import { LoginScreen } from '@/components/auth/LoginScreen';
// v0.13.53: Video loading animation
import { LoadingScreen } from '@/components/auth/LoadingScreen';
// v0.27.48: Cross-module event notifications
import { useCrossModuleEventNotifications } from '@/hooks/useCrossModuleEventNotifications';
// v0.27.84: Safety signal cascade overlay
import { SafetySignalCascadeOverlay } from '@/components/cross-module/SafetySignalCascadeOverlay';

// ============================================
// v139: Dynamic Screen Imports with Skeletons
// v0.15.30: Added ssr: false for client-heavy screens
// ============================================

// Portfolio is statically imported (always the initial screen)
import { PortfolioScreen } from '@/components/screens/PortfolioScreen';

// Dynamically import other screens with loading skeletons
// Heavy screens (>100KB) use ssr: false for faster client-side rendering
const DynamicScreens = {
  'home': dynamic(() => import('@/components/screens/HomeScreen').then(m => ({ default: m.HomeScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading...</div></div>,
  }),
  'action-center': dynamic(() => import('@/components/screens/ActionCenterScreen').then(m => ({ default: m.ActionCenterScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading My Tasks...</div></div>,
  }),
  activity: dynamic(() => import('@/components/screens/ActivityScreen').then(m => ({ default: m.ActivityScreen })), {
    loading: () => <ActivityScreenSkeleton />,
  }),
  development: dynamic(() => import('@/components/screens/DevelopmentScreen').then(m => ({ default: m.DevelopmentScreen })), {
    loading: () => <DevelopmentScreenSkeleton />,
    ssr: false, // v0.15.30: 115KB - client-only
  }),
  submissions: dynamic(() => import('@/components/screens/SubmissionsScreen').then(m => ({ default: m.SubmissionsScreen })), {
    loading: () => <SubmissionsScreenSkeleton />,
  }),
  'submissions-hub': dynamic(() => import('@/components/screens/SubmissionsHubScreen').then(m => ({ default: m.SubmissionsHubScreen })), {
    loading: () => <SubmissionsHubScreenSkeleton />,
  }),
  'submission-planning': dynamic(() => import('@/components/screens/GlobalSubmissionPlanScreen').then(m => ({ default: m.GlobalSubmissionPlanScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Submission Planning...</div></div>,
  }),
  'template-registry': dynamic(() => import('@/components/screens/TemplateRegistryScreen').then(m => ({ default: m.TemplateRegistryScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Template Registry...</div></div>,
  }),
  'submission-command': dynamic(() => import('@/components/screens/SubmissionCommandCenter').then(m => ({ default: m.SubmissionCommandCenter })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Command Center...</div></div>,
  }),
  'registrations': dynamic(() => import('@/components/screens/RegistrationsTracker').then(m => ({ default: m.RegistrationsTracker })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Registrations...</div></div>,
  }),
  'commitments': dynamic(() => import('@/components/screens/CommitmentsManager').then(m => ({ default: m.CommitmentsManager })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Commitments...</div></div>,
  }),
  'portfolio-strategy': dynamic(() => import('@/components/screens/PortfolioStrategyView').then(m => ({ default: m.PortfolioStrategyView })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Portfolio Strategy...</div></div>,
  }),
  'publishing': dynamic(() => import('@/components/screens/UnifiedPublishingScreen').then(m => ({ default: m.UnifiedPublishingScreen })), {
    loading: () => <PublishingCenterScreenSkeleton />,
  }),
  'ectd-workspace': dynamic(() => import('@/components/screens/UnifiedPublishingScreen').then(m => ({ default: m.UnifiedPublishingScreen })), {
    loading: () => <ECTDWorkspaceScreenSkeleton />,
    ssr: false, // v0.15.30: 101KB - client-only
  }),
  'ectd-publishing': dynamic(() => import('@/components/screens/UnifiedPublishingScreen').then(m => ({ default: m.UnifiedPublishingScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading eCTD Publishing...</div></div>,
  }),
  'publishing-center': dynamic(() => import('@/components/screens/UnifiedPublishingScreen').then(m => ({ default: m.UnifiedPublishingScreen })), {
    loading: () => <PublishingCenterScreenSkeleton />,
  }),
  authoring: dynamic(() => import('@/components/screens/AuthoringScreen').then(m => ({ default: m.AuthoringScreen })), {
    loading: () => <AuthoringScreenSkeleton />,
  }),
  haq: dynamic(() => import('@/components/screens/HAQScreen').then(m => ({ default: m.HAQScreen })), {
    loading: () => <HAQScreenSkeleton />,
    ssr: false, // v0.15.30: 112KB - client-only
  }),
  admin: dynamic(() => import('@/components/screens/AdminScreen').then(m => ({ default: m.AdminScreen })), {
    loading: () => <AdminScreenSkeleton />,
  }),
  strategy: dynamic(() => import('@/components/screens/RegStrategyScreen').then(m => ({ default: m.RegStrategyScreen })), {
    loading: () => <RegStrategyScreenSkeleton />,
  }),
  research: dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  // v0.40.4: Research sub-modules - all use ResearchScreen with different initial views
  'research-lead-opt': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-translational': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-targets': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-preclinical': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-ind': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-literature': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'research-intelligence': dynamic(() => import('@/components/screens/ResearchScreen').then(m => ({ default: m.ResearchScreen })), {
    loading: () => <ResearchScreenSkeleton />,
  }),
  'sample-management': dynamic(() => import('@/components/screens/SampleManagementScreen').then(m => ({ default: m.SampleManagementScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Sample Management...</div></div>,
  }),
  quality: dynamic(() => import('@/components/screens/QualityScreen').then(m => ({ default: m.QualityScreen })), {
    loading: () => <QualityScreenSkeleton />,
  }),
  labeling: dynamic(() => import('@/components/screens/LabelingScreen').then(m => ({ default: m.LabelingScreen })), {
    loading: () => <LabelingScreenSkeleton />,
  }),
  safety: dynamic(() => import('@/components/screens/SafetyScreen').then(m => ({ default: m.SafetyScreen })), {
    loading: () => <SafetyScreenSkeleton />,
    ssr: false, // v0.15.30: 178KB - client-only
  }),
  psmf: dynamic(() => import('@/components/screens/PSMFScreen').then(m => ({ default: m.PSMFScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading PSMF...</div></div>,
  }),
  glp: dynamic(() => import('@/components/screens/GLPScreen').then(m => ({ default: m.GLPScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading GLP Compliance...</div></div>,
    ssr: false, // v0.15.30: 148KB - client-only
  }),
  gcp: dynamic(() => import('@/components/screens/GCPScreen').then(m => ({ default: m.GCPScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading GCP Compliance...</div></div>,
    ssr: false,
  }),
  gmp: dynamic(() => import('@/components/screens/GMPScreen').then(m => ({ default: m.GMPScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading GMP Compliance...</div></div>,
    ssr: false,
  }),
  adpromo: dynamic(() => import('@/components/screens/AdPromoScreen').then(m => ({ default: m.AdPromoScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Ad/Promo Review...</div></div>,
    ssr: false,
  }),
  nonclinical: dynamic(() => import('@/components/screens/NonclinicalScreen').then(m => ({ default: m.NonclinicalScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Nonclinical...</div></div>,
  }),
  cmc: dynamic(() => import('@/components/screens/UnifiedCMCManufacturingScreen').then(m => ({ default: m.UnifiedCMCManufacturingScreen })), {
    loading: () => <CMCScreenSkeleton />,
    ssr: false, // v0.15.30: 97KB - client-only
  }),
  'cmc-manufacturing': dynamic(() => import('@/components/screens/UnifiedCMCManufacturingScreen').then(m => ({ default: m.UnifiedCMCManufacturingScreen })), {
    loading: () => <CMCScreenSkeleton />,
    ssr: false, // v0.15.30: 97KB - client-only
  }),
  'master-data': dynamic(() => import('@/components/screens/MasterDataScreen').then(m => ({ default: m.MasterDataScreen })), {
    loading: () => <MasterDataScreenSkeleton />,
  }),
  'document-control': dynamic(() => import('@/components/screens/DocumentControlScreen').then(m => ({ default: m.DocumentControlScreen })), {
    loading: () => <DocumentControlScreenSkeleton />,
  }),
  ctms: dynamic(() => import('@/components/screens/ClinicalDevelopmentScreen').then(m => ({ default: m.ClinicalDevelopmentScreen })), {
    loading: () => <CTMSScreenSkeleton />,
    ssr: false,
  }),
  'study-startup': dynamic(() => import('@/components/screens/ClinicalDevelopmentScreen').then(m => ({ default: m.ClinicalDevelopmentScreen })), {
    loading: () => <CTMSScreenSkeleton />,
    ssr: false,
  }),
  'study-design': dynamic(() => import('@/components/screens/ClinicalDevelopmentScreen').then(m => ({ default: m.ClinicalDevelopmentScreen })), {
    loading: () => <CTMSScreenSkeleton />,
  }),
  tmf: dynamic(() => import('@/components/screens/TMFScreen').then(m => ({ default: m.TMFScreen })), {
    loading: () => <TMFScreenSkeleton />,
  }),
  biostats: dynamic(() => import('@/components/screens/BiostatsScreen').then(m => ({ default: m.BiostatsScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Biostatistics...</div></div>,
  }),
  'study-intel': dynamic(() => import('@/components/screens/StudyIntelScreen').then(m => ({ default: m.StudyIntelScreen })), {
    loading: () => <StudyIntelScreenSkeleton />,
  }),
  qms: dynamic(() => import('@/components/screens/QMSScreen').then(m => ({ default: m.QMSScreen })), {
    loading: () => <QMSScreenSkeleton />,
    ssr: false, // v0.15.30: 138KB - client-only
  }),
  'inspector-readiness': dynamic(() => import('@/components/screens/InspectorReadinessScreen').then(m => ({ default: m.InspectorReadinessScreen })), {
    loading: () => <InspectorReadinessScreenSkeleton />,
  }),
  'reg-calendar': dynamic(() => import('@/components/screens/RegulatoryCalendarScreen').then(m => ({ default: m.RegulatoryCalendarScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Calendar...</div></div>,
  }),
  'ai-generation': dynamic(() => import('@/components/screens/AIDocumentGenerationScreen').then(m => ({ default: m.AIDocumentGenerationScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading AI Generation...</div></div>,
  }),
  'medical-affairs': dynamic(() => import('@/components/screens/MedicalAffairsScreen').then(m => ({ default: m.MedicalAffairsScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Medical Affairs...</div></div>,
    ssr: false, // v0.15.30: 191KB - client-only (largest screen)
  }),
  'supply-chain': dynamic(() => import('@/components/screens/SupplyChainScreen').then(m => ({ default: m.SupplyChainScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Supply Chain...</div></div>,
    ssr: false, // v0.15.30: 108KB - client-only
  }),
  'continuous-submission': dynamic(() => import('@/components/screens/ContinuousSubmissionDashboard'), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Continuous Submission...</div></div>,
  }),
  'ectd-intelligence': dynamic(() => import('@/components/screens/ECTDIntelligenceScreen'), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading eCTD Intelligence...</div></div>,
  }),
  'reg-intel': dynamic(() => import('@/components/screens/RegulatoryIntelligenceScreen').then(m => ({ default: m.RegulatoryIntelligenceScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Regulatory Intelligence...</div></div>,
  }),
  'ai-consistency': dynamic(() => import('@/components/screens/AIConsistencyEngineDashboard'), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading AI Consistency...</div></div>,
  }),
  'idmp': dynamic(() => import('@/components/screens/IDMPDashboard'), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading IDMP...</div></div>,
  }),
  'analytics': dynamic(() => import('@/components/screens/PlatformAnalyticsDashboard'), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Analytics...</div></div>,
  }),
  // v0.125.81: BD module
  'bd': dynamic(() => import('@/components/screens/BDScreen').then(m => ({ default: m.BDScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading BD...</div></div>,
  }),
  'bd-due-diligence': dynamic(() => import('@/components/screens/BDScreen').then(m => ({ default: m.BDScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading BD...</div></div>,
  }),
  'bd-data-room': dynamic(() => import('@/components/screens/BDScreen').then(m => ({ default: m.BDScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading BD...</div></div>,
  }),
  'commercial': dynamic(() => import('@/components/screens/CommercialScreen').then(m => ({ default: m.CommercialScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Commercial...</div></div>,
  }),
  'manufacturing': dynamic(() => import('@/components/screens/UnifiedCMCManufacturingScreen').then(m => ({ default: m.UnifiedCMCManufacturingScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Manufacturing...</div></div>,
    ssr: false, // v0.15.30: 97KB - client-only
  }),
  'archives': dynamic(() => import('@/components/screens/RDArchivesScreen').then(m => ({ default: m.RDArchivesScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading R&D Archives...</div></div>,
    ssr: false, // v0.15.30: 98KB - client-only
  }),
  'rd-connected': dynamic(() => import('@/components/screens/RDConnectedScreen').then(m => ({ default: m.RDConnectedScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading R&D Connected...</div></div>,
    ssr: false,
  }),
  'agent-hub': dynamic(() => import('@/components/screens/AgentHubScreen').then(m => ({ default: m.AgentHubScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Agent Hub...</div></div>,
  }),
  'eln': dynamic(() => import('@/components/screens/ELNScreen').then(m => ({ default: m.ELNScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading Lab Notebook...</div></div>,
  }),
  // v0.33.23: New module aliases for reorganized navigation
  // v0.34.0: Dedicated screens for Signal Detection, Stability, Batch Records
  'signal-detection': dynamic(() => import('@/components/screens/SignalDetectionScreen').then(m => ({ default: m.SignalDetectionScreen })), {
    loading: () => <SafetyScreenSkeleton />,
    ssr: false,
  }),
  'stability': dynamic(() => import('@/components/screens/StabilityScreen').then(m => ({ default: m.StabilityScreen })), {
    loading: () => <CMCScreenSkeleton />,
    ssr: false,
  }),
  'batch-records': dynamic(() => import('@/components/screens/BatchRecordsScreen').then(m => ({ default: m.BatchRecordsScreen })), {
    loading: () => <CMCScreenSkeleton />,
    ssr: false,
  }),
  'ai-authoring': dynamic(() => import('@/components/screens/AIDocumentGenerationScreen').then(m => ({ default: m.AIDocumentGenerationScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading AI Authoring...</div></div>,
  }),
  // v0.42.43: SPL screen wired to useSPLStore
  'spl': dynamic(() => import('@/components/screens/SPLScreen').then(m => ({ default: m.SPLScreen })), {
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading SPL...</div></div>,
    ssr: false,
  }),
};

// Placeholder for unimplemented modules
const PlaceholderScreen = dynamic(() => import('@/components/screens/PlaceholderScreen').then(m => ({ default: m.PlaceholderScreen })), {
  loading: () => <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-muted">Loading...</div></div>,
});

// ============================================
// v139: Prefetch Map - which modules to prefetch on hover
// ============================================
const PREFETCH_MAP: Partial<Record<ModuleId, ModuleId[]>> = {
  portfolio: ['action-center', 'activity', 'authoring', 'submissions', 'haq', 'safety'], // Common next destinations
  'action-center': ['haq', 'safety', 'qms', 'authoring', 'portfolio'], // Task-related modules
  activity: ['portfolio', 'safety', 'labeling', 'submissions'], // Cross-module monitoring
  authoring: ['submissions', 'haq', 'portfolio'],
  submissions: ['authoring', 'haq', 'publishing'],
  'submissions-hub': ['publishing', 'submissions', 'submission-command'],
  'submission-command': ['submissions-hub', 'publishing', 'authoring', 'haq'],
  'publishing': ['submissions-hub', 'authoring', 'haq', 'submissions'],
  'ectd-workspace': ['publishing', 'submissions', 'authoring'],
  'ectd-publishing': ['publishing', 'submissions-hub'],
  'publishing-center': ['publishing', 'submissions-hub'],
  haq: ['authoring', 'submissions', 'portfolio'],
  safety: ['ctms', 'portfolio', 'quality', 'activity', 'psmf'],
  psmf: ['safety', 'quality', 'ctms', 'activity'],  // v0.13.64: PSMF
  glp: ['nonclinical', 'safety', 'qms', 'research', 'ctms'],  // v0.13.67: GLP Compliance
  ctms: ['tmf', 'safety', 'study-intel', 'study-design', 'glp'],
  tmf: ['ctms', 'study-intel'],
  quality: ['qms', 'cmc-manufacturing'],
  qms: ['quality', 'cmc-manufacturing', 'glp'],
  cmc: ['cmc-manufacturing', 'quality', 'authoring'],
  strategy: ['portfolio', 'submissions'],
  research: ['nonclinical', 'development', 'portfolio', 'sample-management'],
  nonclinical: ['research', 'safety', 'development', 'authoring', 'glp'],
  development: ['research', 'ctms'],
  labeling: ['authoring', 'submissions', 'activity', 'spl'],
  spl: ['labeling', 'submissions', 'idmp'],
  admin: ['master-data', 'portfolio'],
  publications: ['authoring'],
  'registrations': ['submissions-hub', 'publishing', 'portfolio'],
  'commitments': ['submissions-hub', 'haq', 'portfolio'],
  'portfolio-strategy': ['portfolio', 'submissions', 'strategy'],
  // v0.33.23: New module prefetch mappings
  'gcp': ['ctms', 'inspector-readiness', 'qms'],
  'gmp': ['cmc-manufacturing', 'qms', 'quality'],
  'adpromo': ['labeling', 'commercial', 'medical-affairs'],
};

const moduleNames: Partial<Record<ModuleId, string>> = {
  home: 'R&D Command Center',
  portfolio: 'Portfolio Command Center',
  activity: 'Cross-Module Activity',
  strategy: 'Regulatory Strategy & Intelligence',
  // v0.40.4: Research section modules
  research: 'Research Overview',
  'research-lead-opt': 'Lead Optimization',
  'research-translational': 'Translational Science',
  'research-targets': 'Target Programs',
  'research-preclinical': 'Preclinical Studies',
  'research-ind': 'IND Readiness',
  'research-literature': 'Literature Monitoring',
  'research-intelligence': 'Competitive Intelligence',
  'sample-management': 'Sample Management',
  development: 'Clinical Development',
  safety: 'Pharmacovigilance',
  psmf: 'PSMF - PV System Master File',
  nonclinical: 'Nonclinical Development',
  quality: 'Quality',
  cmc: 'Chemistry & Manufacturing',
  'cmc-manufacturing': 'Chemistry & Manufacturing', // Legacy
  authoring: 'Structured Content Authoring',
  labeling: 'Global Labeling',
  submissions: 'Regulatory Submissions',
  haq: 'HAQ Management',
  publications: 'Scientific Publications',
  admin: 'Administration',
  'master-data': 'Master Data & IDMP',
  'document-control': 'Document Control',
  'ctms': 'Clinical Trial Management',
  'study-startup': 'Study Startup Orchestrator',
  'study-design': 'Study Design (USDM)',
  'tmf': 'Trial Master File',
  'biostats': 'Biostatistics',
  'study-intel': 'Study Intelligence',
  'qms': 'Quality Management System',
  'inspector-readiness': 'Inspector Readiness',
  'reg-calendar': 'Regulatory Calendar',
  'glp': 'GLP Compliance',
};

// Modules that don't show the filter bar (admin only)
const noFilterBarModules: ModuleId[] = ['home', 'admin', 'activity', 'agent-hub', 'master-data', 'document-control', 'ctms', 'study-startup', 'tmf', 'biostats', 'study-intel', 'qms', 'inspector-readiness', 'reg-calendar', 'ai-generation', 'ai-authoring', 'medical-affairs', 'continuous-submission', 'ectd-intelligence', 'reg-intel', 'ai-consistency', 'idmp', 'analytics', 'commercial', 'manufacturing', 'cmc-manufacturing', 'cmc', 'stability', 'batch-records', 'sample-management', 'psmf', 'glp', 'gcp', 'gmp', 'adpromo', 'archives', 'eln', 'registrations', 'commitments', 'portfolio-strategy', 'signal-detection', 'submission-command', 'spl', 'rd-connected', 'bd', 'bd-due-diligence', 'bd-data-room'];

// Modules that show application type filter
const showAppTypeFilterModules: ModuleId[] = ['submissions', 'submissions-hub', 'publishing', 'ectd-workspace', 'publishing-center', 'haq'];

export default function Home() {
  // ==========================================================================
  // ALL HOOKS MUST BE CALLED FIRST (before any conditional returns)
  // ==========================================================================
  
  // v0.13.11: Auth state
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  
  // Global state from AppStore
  const activeModule = useAppStore((s) => s.selection.activeModule) as ModuleId;
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const filters = useAppStore(useShallow((s) => s.filters));
  const setFilters = useAppStore((s) => s.setFilters);
  
  // v139: Track visited modules for keep-mounted optimization
  const [visitedModules, setVisitedModules] = useState<Set<ModuleId>>(new Set<ModuleId>(['portfolio']));
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // v0.25.1: Sidebar state management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  // v0.27.48: Enable cross-module event notifications (shows toasts for important events)
  useCrossModuleEventNotifications({ enabled: isAuthenticated });

  // v0.122.0: URL param deep-linking — ?module=haq navigates on load.
  // Enables Playwright smoke tests to test each module directly.
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const moduleParam = params.get('module') as ModuleId | null;
    if (moduleParam && moduleParam !== activeModule) {
      setActiveModule(moduleParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // v0.45.1: Feature flag gating
  const isModuleEnabled = useFeatureFlags(s => s.isModuleEnabled);
  
  // v139: Mark module as visited when it becomes active
  useEffect(() => {
    if (!isAuthenticated) return;
    setVisitedModules(prev => {
      if (prev.has(activeModule)) return prev;
      const next = new Set(prev);
      next.add(activeModule);
      return next;
    });
  }, [activeModule, isAuthenticated]);
  
  // v139: Prefetch likely next modules when hovering on current module's sidebar
  const prefetchModules = useCallback((moduleIds: ModuleId[]) => {
    moduleIds.forEach(id => {
      if (id in DynamicScreens && !visitedModules.has(id)) {
        import(`@/components/screens/${getScreenFileName(id)}`).catch(() => {
          // Silently ignore prefetch errors
        });
      }
    });
  }, [visitedModules]);
  
  // v139: On module change, schedule prefetch of related modules
  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
    
    prefetchTimeoutRef.current = setTimeout(() => {
      const relatedModules = PREFETCH_MAP[activeModule] || [];
      prefetchModules(relatedModules);
    }, 500);
    
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, [activeModule, prefetchModules, isAuthenticated]);
  
  // Convert FilterState to store format and vice versa
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters({
      product: newFilters.product,
      therapeuticArea: newFilters.therapeuticArea,
      modality: newFilters.modality,
      region: newFilters.region,
      stage: newFilters.stage,
    });
  }, [setFilters]);
  
  // Handle module change from Header
  const handleModuleChange = useCallback((module: ModuleId, skipHistory = false) => {
    import('@/services/usage-event-service').then(({ usageEventService }) => {
      usageEventService.trackModuleVisit(module);
    });
    setActiveModule(module, skipHistory);
  }, [setActiveModule]);
  
  // ==========================================================================
  // AUTH GATING (after all hooks are called)
  // ==========================================================================
  
  // Show loading state while checking session
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Initializing..." />;
  }
  
  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  // ==========================================================================
  // AUTHENTICATED CONTENT
  // ==========================================================================
  
  // Build FilterState from store (add applicationType which store doesn't have)
  const filterState: FilterState = {
    ...filters,
    applicationType: 'all', // Store doesn't track this yet
  };

  // v139: Render screen with keep-mounted optimization
  // Visited modules stay mounted but hidden for instant switching
  const renderScreen = () => {
    // Generate screens for all visited modules
    const screens = Array.from(visitedModules).map(moduleId => {
      const isActive = moduleId === activeModule;

      // v0.44.53: HomeScreen needs onNavigate instead of filters
      if (moduleId === 'home') {
        const { HomeScreen } = require('@/components/screens/HomeScreen');
        return (
          <div
            key={moduleId}
            className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}
            aria-hidden={!isActive}
          >
            <ModuleErrorBoundary moduleName="R&D Command Center">
              <HomeScreen onNavigate={handleModuleChange} />
            </ModuleErrorBoundary>
          </div>
        );
      }

      const Screen = getScreenComponent(moduleId);
      
      // v0.45.1: Feature flag gate — show locked screen for gated modules
      if (!isModuleEnabled(moduleId)) {
        return (
          <div
            key={moduleId}
            className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}
            aria-hidden={!isActive}
          >
            <ModuleLockedScreen
              moduleId={moduleId}
              onNavigateHome={() => handleModuleChange('portfolio')}
            />
          </div>
        );
      }

      // v0.125.92: BD sub-routes pass initialView to switch to the correct tab
      if (moduleId === 'bd-due-diligence' || moduleId === 'bd-data-room') {
        const { BDScreen } = require('@/components/screens/BDScreen');
        const initialView = moduleId === 'bd-due-diligence' ? 'due-diligence' : 'data-room';
        return (
          <div
            key={moduleId}
            className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}
            aria-hidden={!isActive}
          >
            <ModuleErrorBoundary moduleName={moduleNames[moduleId]}>
              <BDScreen initialView={initialView} />
            </ModuleErrorBoundary>
          </div>
        );
      }

      return (
        <div
          key={moduleId}
          className={isActive ? 'flex-1 flex flex-col overflow-hidden' : 'hidden'}
          aria-hidden={!isActive}
        >
          <ModuleErrorBoundary moduleName={moduleNames[moduleId]}>
            <Screen filters={filterState} />
          </ModuleErrorBoundary>
        </div>
      );
    });
    
    return <>{screens}</>;
  };

  const showFilterBar = !noFilterBarModules.includes(activeModule);
  const showAppTypeFilter = showAppTypeFilterModules.includes(activeModule);

  return (
    <NotificationProvider>
      <div className="h-screen [height:100dvh] flex bg-surface">
        {/* v0.25.1: Left Sidebar - visible on desktop/tablet, hidden on mobile */}
        {!isMobile && (
          <Sidebar
            activeModule={activeModule}
            onModuleChange={handleModuleChange}
            isCollapsed={isTablet ? true : sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* v0.125.26: Mobile slide-in drawer */}
        {isMobile && (
          <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 ${mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
            />
            {/* Panel — overflow-y-auto + touch scroll so sidebar nav scrolls on iOS */}
            <div
              className={`absolute top-0 left-0 h-full w-[280px] max-w-[85vw] overflow-y-auto overscroll-contain transition-transform duration-300 ease-in-out ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <Sidebar
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
                isCollapsed={false}
                mobileDrawer={true}
                onClose={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header 
            activeModule={activeModule} 
            moduleName={moduleNames[activeModule]} 
            onModuleChange={handleModuleChange}
            sidebarCollapsed={!isMobile && (isTablet || sidebarCollapsed)}
            onMobileNavOpen={() => setMobileNavOpen(true)}
          />

          {/* v0.125.31: Scope context is now in the Header ScopeSelector pill */}
          
          <main className="flex-1 flex flex-col overflow-hidden min-h-0 pb-16 md:pb-0">
            {showFilterBar && (
              <FilterBar 
                filters={filterState} 
                onFiltersChange={handleFiltersChange}
                showApplicationFilter={showAppTypeFilter}
              />
            )}
            {renderScreen()}
          </main>
        </div>

        {/* AI Chat Assistant - floating */}
        <AIChatAssistant />

        {/* v0.125.29: Cascade banner — floating pill, bottom-right */}
        <CascadeBanner />
        
        {/* v204d-b15: Demo Mode Components re-enabled in v0.43.2 */}
        <GuidedDemoOverlay />
        
        {/* v0.27.84: Safety Signal Cascade Overlay */}
        <SafetySignalCascadeOverlay 
          onNavigateToModule={(moduleId) => handleModuleChange(moduleId as ModuleId)}
        />
        
        {/* v115: Command Palette (Cmd+K) */}
        <CommandPalette />

        {/* v0.125.26: Mobile bottom tab bar */}
        <MobileBottomNav
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          onOpenNav={() => setMobileNavOpen(true)}
        />
      </div>
      {/* v0.125.73: Favorites slide-over panel — mounts outside layout flow */}
      <FavoritesPanel />
    </NotificationProvider>
  );
}

// ============================================
// v139: Helper Functions
// ============================================

/** Map module ID to screen component file name */
function getScreenFileName(moduleId: ModuleId): string {
  const fileNames: Partial<Record<ModuleId, string>> = {
    portfolio: 'PortfolioScreen',
    'action-center': 'ActionCenterScreen',
    activity: 'ActivityScreen',
    development: 'DevelopmentScreen',
    submissions: 'SubmissionsScreen',
    'submissions-hub': 'SubmissionsHubScreen',
    'submission-command': 'SubmissionCommandCenter',
    'submission-planning': 'GlobalSubmissionPlanScreen',
    'template-registry': 'TemplateRegistryScreen',
    'publishing': 'UnifiedPublishingScreen',
    'ectd-workspace': 'UnifiedPublishingScreen',
    'ectd-publishing': 'UnifiedPublishingScreen',
    'publishing-center': 'UnifiedPublishingScreen',
    authoring: 'AuthoringScreen',
    haq: 'HAQScreen',
    admin: 'AdminScreen',
    strategy: 'RegStrategyScreen',
    research: 'ResearchScreen',
    'sample-management': 'SampleManagementScreen',
    quality: 'QualityScreen',
    labeling: 'LabelingScreen',
    safety: 'SafetyScreen',
    psmf: 'PSMFScreen',
    glp: 'GLPScreen',
    gcp: 'GLPScreen',
    gmp: 'GLPScreen',
    nonclinical: 'NonclinicalScreen',
    cmc: 'UnifiedCMCManufacturingScreen',
    'cmc-manufacturing': 'UnifiedCMCManufacturingScreen',
    'master-data': 'MasterDataScreen',
    'document-control': 'DocumentControlScreen',
    ctms: 'CTMSScreen',
    'study-startup': 'CTMSScreen',
    'study-design': 'StudyDesignScreen',
    tmf: 'TMFScreen',
    'study-intel': 'StudyIntelScreen',
    qms: 'QMSScreen',
    'inspector-readiness': 'InspectorReadinessScreen',
    'reg-calendar': 'RegulatoryCalendarScreen',
    'ai-generation': 'AIDocumentGenerationScreen',
    'medical-affairs': 'MedicalAffairsScreen',
    'continuous-submission': 'ContinuousSubmissionDashboard',
    'ectd-intelligence': 'ECTDIntelligenceScreen',
    'ai-consistency': 'AIConsistencyEngineDashboard',
    'idmp': 'IDMPDashboard',
    'analytics': 'PlatformAnalyticsDashboard',
    'supply-chain': 'SupplyChainScreen',
    publications: 'PlaceholderScreen',
    'commercial': 'CommercialScreen',
    'manufacturing': 'UnifiedCMCManufacturingScreen',
    'archives': 'RDArchivesScreen',
    'eln': 'ELNScreen',
    'registrations': 'RegistrationsTracker',
    'commitments': 'CommitmentsManager',
    'portfolio-strategy': 'PortfolioStrategyView',
    'adpromo': 'CommercialScreen',
    // v0.33.23: New modules
    'signal-detection': 'SafetyScreen',
    'stability': 'UnifiedCMCManufacturingScreen',
    'batch-records': 'UnifiedCMCManufacturingScreen',
    'ai-authoring': 'AIDocumentGenerationScreen',
  };
  return fileNames[moduleId] || 'PlaceholderScreen';
}

/** Get the appropriate screen component for a module */
function getScreenComponent(moduleId: ModuleId): React.ComponentType<{ filters?: FilterState }> {
  if (moduleId === 'portfolio') {
    return PortfolioScreen;
  }
  
  const DynamicScreen = DynamicScreens[moduleId as keyof typeof DynamicScreens];
  if (DynamicScreen) {
    return DynamicScreen as React.ComponentType<{ filters?: FilterState }>;
  }
  
  // Fallback to placeholder
  return PlaceholderScreen as React.ComponentType<{ filters?: FilterState }>;
}
