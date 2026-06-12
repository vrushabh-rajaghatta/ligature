

import { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Database, FlaskConical, ShieldAlert,
  FileText, Link2, CheckCircle, AlertTriangle, Clock, Beaker,
  Activity, TrendingUp, Users, ArrowRight, ExternalLink, Zap,
  Microscope, PieChart, Target
} from 'lucide-react';

// Import data sources for R&D Connected
import { authoringDocuments } from '@/data/authoring-data';
import { safetySignals } from '@/data/safety-data';
import { translationalStudies, safetyTranslations } from '@/data/translational-data';
import { clinicalTrials } from '@/data/clinical-data';
import { teamMembers, raciMatrix, getTeamMember } from '@/data/planning-data';
import { batchRecords, doeStudies } from '@/data/cmc-data';

interface RDConnectedContextPanelProps {
  selectedSection?: string;
  selectedDocumentId?: string;
  productId?: string;
  onNavigate?: (module: string, path: string) => void;
}

// Map CTD sections to source data types
const sectionSourceMapping: Record<string, { 
  sourceTypes: string[];
  label: string;
  description: string;
}> = {
  '2.5': { 
    sourceTypes: ['clinical-studies', 'safety-signals', 'efficacy-analysis'],
    label: 'Clinical Overview',
    description: 'Integrates CSRs, safety data, and efficacy summaries'
  },
  '2.7': { 
    sourceTypes: ['clinical-studies', 'statistical-analyses', 'integrated-summaries'],
    label: 'Clinical Summary',
    description: 'Draws from individual study reports and ISS/ISE'
  },
  '2.4': { 
    sourceTypes: ['preclinical-studies', 'translational-data', 'toxicology'],
    label: 'Nonclinical Overview',
    description: 'Summarizes preclinical pharmacology and toxicology'
  },
  '2.6': {
    sourceTypes: ['preclinical-studies', 'pk-studies', 'toxicology'],
    label: 'Nonclinical Summary',
    description: 'Tabulated data from all nonclinical studies'
  },
  '2.3': {
    sourceTypes: ['cmc-studies', 'batch-data', 'specifications'],
    label: 'Quality Overall Summary',
    description: 'CMC data from drug substance and product development'
  },
  '3.2.S': {
    sourceTypes: ['drug-substance', 'manufacturing-data', 'specifications'],
    label: 'Drug Substance',
    description: 'Process development, characterization, specifications'
  },
  '3.2.P': {
    sourceTypes: ['drug-product', 'formulation-development', 'stability'],
    label: 'Drug Product',
    description: 'Formulation, manufacturing process, stability data'
  },
  '5.3.5.1': {
    sourceTypes: ['clinical-studies', 'csr', 'datasets'],
    label: 'Study Reports',
    description: 'Individual clinical study reports with datasets'
  },
};

// Get source data for a section
function getSourceDataForSection(section: string, productId: string = 'lig-2847') {
  const mapping = sectionSourceMapping[section];
  if (!mapping) return null;

  const sources: {
    type: string;
    items: Array<{
      id: string;
      title: string;
      status: string;
      link: string;
      statusColor: string;
      linkedSignal?: boolean;
    }>;
  }[] = [];

  // Clinical Studies
  if (mapping.sourceTypes.some(t => ['clinical-studies', 'csr'].includes(t))) {
    const trials = clinicalTrials.filter(t => t.productId === productId);
    sources.push({
      type: 'Clinical Studies',
      items: trials.slice(0, 3).map(trial => ({
        id: trial.id,
        title: `${trial.protocolNumber}: ${trial.shortTitle}`,
        status: trial.status,
        link: `/clinical/trials/${trial.id}`,
        statusColor: trial.status === 'completed' ? 'text-accent-green' : 
                     trial.status === 'active' ? 'text-accent-blue' : 'text-slate-400'
      }))
    });
  }

  // Safety Signals
  if (mapping.sourceTypes.some(t => ['safety-signals', 'efficacy-analysis'].includes(t))) {
    const signals = safetySignals.filter(s => s.productId === productId);
    if (signals.length > 0) {
      sources.push({
        type: 'Safety Signals',
        items: signals.slice(0, 3).map(signal => ({
          id: signal.id,
          title: signal.signal,
          status: signal.status,
          link: `/safety/signals/${signal.id}`,
          statusColor: signal.status === 'confirmed' ? 'text-accent-red' :
                       signal.status === 'under-evaluation' ? 'text-accent-amber' : 'text-accent-blue',
          linkedSignal: true
        }))
      });
    }
  }

  // Translational Studies
  if (mapping.sourceTypes.some(t => ['translational-data', 'preclinical-studies', 'toxicology'].includes(t))) {
    const transStudies = translationalStudies.filter(s => s.productId === productId);
    if (transStudies.length > 0) {
      sources.push({
        type: 'Translational Science',
        items: transStudies.slice(0, 3).map(study => ({
          id: study.id,
          title: `${study.studyNumber}: ${study.title.substring(0, 40)}...`,
          status: study.status,
          link: `/research/translational/${study.id}`,
          statusColor: study.status === 'completed' ? 'text-accent-green' : 'text-accent-blue'
        }))
      });
    }
  }

  // CMC Studies
  if (mapping.sourceTypes.some(t => ['cmc-studies', 'drug-substance', 'drug-product', 'batch-data'].includes(t))) {
    const studies = doeStudies?.filter(s => s.productId === productId) || [];
    const batches = batchRecords?.filter(b => b.productId === productId) || [];
    
    if (studies.length > 0 || batches.length > 0) {
      sources.push({
        type: 'CMC Data',
        items: [
          ...studies.slice(0, 2).map(study => ({
            id: study.id,
            title: `${study.studyNumber}: ${study.title.substring(0, 30)}...`,
            status: study.status,
            link: `/cmc/studies/${study.id}`,
            statusColor: study.status === 'completed' ? 'text-accent-green' : 'text-accent-blue'
          })),
          ...batches.slice(0, 1).map(batch => ({
            id: batch.id,
            title: `Batch ${batch.batchNumber}`,
            status: batch.status,
            link: `/manufacturing/batches/${batch.id}`,
            statusColor: batch.status === 'released' ? 'text-accent-green' : 'text-accent-amber'
          }))
        ]
      });
    }
  }

  return { mapping, sources };
}

// Get dependencies for a document
function getDependencies(section: string, productId: string = 'lig-2847') {
  const dependencies: Array<{
    documentId: string;
    documentTitle: string;
    section: string;
    status: 'ready' | 'in-progress' | 'not-started';
    progress?: number;
    owner?: string;
  }> = [];

  // 2.5 Clinical Overview depends on CSRs and ISS/ISE
  if (section === '2.5') {
    // Find CSR document
    const csr = authoringDocuments.find(d => d.documentType === 'csr' && d.productId === productId);
    if (csr) {
      dependencies.push({
        documentId: csr.id,
        documentTitle: csr.shortTitle || csr.title,
        section: '5.3.5.1',
        status: csr.status === 'approved' || csr.status === 'submission-ready' ? 'ready' : 
                csr.progress > 50 ? 'in-progress' : 'not-started',
        progress: csr.progress,
        owner: csr.authorName
      });
    }

    // Find ISS/ISE
    const iss = authoringDocuments.find(d => d.documentType === 'iss' && d.productId === productId);
    if (iss) {
      dependencies.push({
        documentId: iss.id,
        documentTitle: iss.shortTitle || iss.title,
        section: '5.3.5.3',
        status: iss.status === 'approved' || iss.status === 'submission-ready' ? 'ready' : 
                iss.progress > 50 ? 'in-progress' : 'not-started',
        progress: iss.progress,
        owner: iss.authorName
      });
    }
  }

  // 2.7 Clinical Summary depends on 2.5 and individual CSRs
  if (section === '2.7') {
    const clinOverview = authoringDocuments.find(d => d.documentType === 'module-25' && d.productId === productId);
    if (clinOverview) {
      dependencies.push({
        documentId: clinOverview.id,
        documentTitle: '2.5 Clinical Overview',
        section: '2.5',
        status: clinOverview.status === 'approved' || clinOverview.status === 'submission-ready' ? 'ready' : 
                clinOverview.progress > 50 ? 'in-progress' : 'not-started',
        progress: clinOverview.progress,
        owner: clinOverview.authorName
      });
    }
  }

  return dependencies;
}

// Get regulatory intelligence for a section
function getRegulatoryIntelligence(section: string) {
  const intelligence: Array<{
    type: 'info' | 'warning' | 'tip';
    title: string;
    message: string;
    source?: string;
  }> = [];

  if (section === '2.5') {
    intelligence.push({
      type: 'warning',
      title: 'FDA Day 74 Letter Analysis',
      message: 'Incomplete Clinical Overview cited in 40% of similar INDs. Ensure benefit-risk is clearly articulated.',
      source: 'Internal regulatory intelligence'
    });
    intelligence.push({
      type: 'tip',
      title: 'Best Practice',
      message: 'Include efficacy summary table before safety discussion. Reviewers prefer this narrative structure.',
      source: 'Reviewer feedback compilation'
    });
  }

  if (section === '2.7') {
    intelligence.push({
      type: 'info',
      title: 'Cross-Reference Requirement',
      message: 'Ensure consistent efficacy endpoint definitions between 2.7.3 and individual CSRs.',
      source: 'ICH E3 Guideline'
    });
  }

  if (section === '3.2.P') {
    intelligence.push({
      type: 'warning',
      title: 'Stability Data Requirement',
      message: 'FDA expects 6-month accelerated stability data minimum. Current data covers 9 months.',
      source: 'ICH Q1E'
    });
  }

  return intelligence;
}

// Get RACI for a section
function getRACI(section: string) {
  const sectionLabel = sectionSourceMapping[section]?.label;
  if (!sectionLabel) return null;

  const assignment = raciMatrix.find(r => 
    r.document.toLowerCase().includes(section.toLowerCase()) ||
    r.section.toLowerCase().includes(section.toLowerCase()) ||
    sectionLabel.toLowerCase().includes(r.document.toLowerCase())
  );

  if (!assignment) return null;

  return assignment.assignments.map(a => ({
    role: a.role,
    member: getTeamMember(a.memberId),
    roleLabel: a.role === 'R' ? 'Responsible' : 
               a.role === 'A' ? 'Accountable' :
               a.role === 'C' ? 'Consulted' : 'Informed'
  }));
}

export function RDConnectedContextPanel({
  selectedSection,
  selectedDocumentId,
  productId = 'lig-2847',
  onNavigate
}: RDConnectedContextPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'sources' | 'dependencies' | 'intelligence' | 'team'>('sources');

  const sourceData = useMemo(() => {
    if (!selectedSection) return null;
    return getSourceDataForSection(selectedSection, productId);
  }, [selectedSection, productId]);

  const dependencies = useMemo(() => {
    if (!selectedSection) return [];
    return getDependencies(selectedSection, productId);
  }, [selectedSection, productId]);

  const intelligence = useMemo(() => {
    if (!selectedSection) return [];
    return getRegulatoryIntelligence(selectedSection);
  }, [selectedSection]);

  const raci = useMemo(() => {
    if (!selectedSection) return null;
    return getRACI(selectedSection);
  }, [selectedSection]);

  if (!selectedSection) {
    return (
      <div className="p-4 text-center text-text-muted">
        <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a CTD section to view connected data</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === 'ready' || status === 'completed' || status === 'confirmed') {
      return <CheckCircle className="w-3.5 h-3.5 text-accent-green" />;
    }
    if (status === 'in-progress' || status === 'active' || status === 'under-evaluation') {
      return <Clock className="w-3.5 h-3.5 text-accent-blue" />;
    }
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="border-t border-border bg-surface-elevated">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-card transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-teal" />
          <span className="text-sm font-medium text-text-primary">R&D Connected</span>
          <span className="text-xs text-text-muted">
            {sourceData?.mapping.label || `Section ${selectedSection}`}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <>
          {/* Tabs */}
          <div className="px-4 border-b border-border">
            <div className="flex gap-1">
              {[
                { id: 'sources', label: 'Source Data', icon: Database },
                { id: 'dependencies', label: 'Dependencies', icon: Link2 },
                { id: 'intelligence', label: 'Reg Intel', icon: Target },
                { id: 'team', label: 'Team', icon: Users },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'border-accent-teal text-accent-teal'
                      : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-64 overflow-auto">
            {/* Sources Tab */}
            {activeTab === 'sources' && sourceData && (
              <div className="space-y-4">
                {sourceData.sources.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    No linked source data for this section
                  </p>
                ) : (
                  sourceData.sources.map((source, idx) => (
                    <div key={idx}>
                      <h4 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                        {source.type === 'Clinical Studies' && <Activity className="w-3.5 h-3.5" />}
                        {source.type === 'Safety Signals' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {source.type === 'Translational Science' && <Microscope className="w-3.5 h-3.5" />}
                        {source.type === 'CMC Data' && <Beaker className="w-3.5 h-3.5" />}
                        {source.type}
                      </h4>
                      <div className="space-y-1.5">
                        {source.items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => onNavigate?.('', item.link)}
                            className="w-full flex items-center justify-between p-2 rounded bg-surface-card hover:bg-surface border border-border text-left group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {getStatusIcon(item.status)}
                              <span className="text-xs text-text-primary truncate">
                                {item.title}
                              </span>
                              {item.linkedSignal && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-accent-purple/20 text-accent-purple rounded">
                                  Predicted
                                </span>
                              )}
                            </div>
                            <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Punchline callout for safety signal */}
                {sourceData.sources.some(s => s.type === 'Safety Signals') && (
                  <div className="mt-3 p-3 rounded-lg bg-accent-purple/10 border border-accent-purple/30">
                    <div className="flex items-start gap-2">
                      <Microscope className="w-4 h-4 text-accent-purple mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-accent-purple">Prediction Confirmed</p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          Hepatotoxicity signal was predicted by TR-2847-003. Preclinical predicted 10-15% incidence; actual clinical: 12%.
                        </p>
                        <button 
                          onClick={() => onNavigate?.('research', '/research/translational/tr-2847-003')}
                          className="text-[11px] text-accent-purple hover:underline mt-1 flex items-center gap-1"
                        >
                          View Translation Study <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dependencies Tab */}
            {activeTab === 'dependencies' && (
              <div className="space-y-2">
                {dependencies.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    No document dependencies identified
                  </p>
                ) : (
                  dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-surface-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        {dep.status === 'ready' ? (
                          <CheckCircle className="w-4 h-4 text-accent-green" />
                        ) : dep.status === 'in-progress' ? (
                          <Clock className="w-4 h-4 text-accent-blue" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-text-primary">{dep.documentTitle}</p>
                          <p className="text-[10px] text-text-muted">Section {dep.section} • {dep.owner}</p>
                        </div>
                      </div>
                      {dep.progress !== undefined && dep.status !== 'ready' && (
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted">{dep.progress}%</span>
                          <div className="w-16 h-1 bg-surface rounded-full overflow-hidden mt-0.5">
                            <div 
                              className="h-full bg-accent-blue"
                              style={{ width: `${dep.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {dependencies.length > 0 && dependencies.every(d => d.status === 'ready') && (
                  <div className="mt-2 p-2 rounded bg-accent-green/10 border border-accent-green/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                      <span className="text-xs text-accent-green font-medium">All dependencies ready</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Regulatory Intelligence Tab */}
            {activeTab === 'intelligence' && (
              <div className="space-y-2">
                {intelligence.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    No regulatory intelligence for this section
                  </p>
                ) : (
                  intelligence.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        item.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
                        item.type === 'tip' ? 'bg-accent-green/10 border-accent-green/30' :
                        'bg-accent-blue/10 border-accent-blue/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />}
                        {item.type === 'tip' && <Zap className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />}
                        {item.type === 'info' && <Target className="w-4 h-4 text-accent-blue mt-0.5 flex-shrink-0" />}
                        <div>
                          <p className={`text-xs font-medium ${
                            item.type === 'warning' ? 'text-amber-400' :
                            item.type === 'tip' ? 'text-accent-green' : 'text-accent-blue'
                          }`}>{item.title}</p>
                          <p className="text-[11px] text-text-secondary mt-1">{item.message}</p>
                          {item.source && (
                            <p className="text-[10px] text-text-muted mt-1">{item.source}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="space-y-2">
                {!raci || raci.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">
                    No RACI assignments for this section
                  </p>
                ) : (
                  raci.map((assignment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-surface-card border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          assignment.role === 'R' ? 'bg-accent-blue/20 text-accent-blue' :
                          assignment.role === 'A' ? 'bg-accent-purple/20 text-accent-purple' :
                          assignment.role === 'C' ? 'bg-accent-amber/20 text-accent-amber' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {assignment.role}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-text-primary">{assignment.member?.name || 'Unassigned'}</p>
                          <p className="text-[10px] text-text-muted">{assignment.roleLabel} • {assignment.member?.role}</p>
                        </div>
                      </div>
                      {assignment.member && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          assignment.member.workload > 80 ? 'bg-accent-red/20 text-accent-red' :
                          assignment.member.workload > 60 ? 'bg-accent-amber/20 text-accent-amber' :
                          'bg-accent-green/20 text-accent-green'
                        }`}>
                          {assignment.member.workload}% load
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-surface">
            <p className="text-[10px] text-text-muted text-center">
              {sourceData?.mapping.description || 'Select sections to see connected data across R&D'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
