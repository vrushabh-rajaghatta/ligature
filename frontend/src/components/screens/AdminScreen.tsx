

import { useState, useRef, useCallback, useEffect } from 'react';
// v0.3.2: Responsive hooks for Admin sidebar
import { useIsMobile, useIsTablet } from '@/hooks/useResponsive';
import { PlatformHealthCheck } from '@/components/admin/PlatformHealthCheck';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
// v132: Data Integrity Widget for system health
import { IntegrityWidget, useDataIntegrity } from '@/components/ui/DataIntegrity';
// v133: User Session Panel
// v0.44.2: UserSwitcherPanel removed (demo personas stripped)
import { DataManagementPanel } from '@/components/DataManagementPanel';
import { ThemeSettingsPanel } from '@/components/admin/ThemeSettingsPanel';
import { AIAdminPanel } from '@/components/admin/AIAdminPanel';
import { CitationMonitorPanel } from '@/components/admin/CitationMonitorPanel';
import { CapabilityProfilePanel }  from '@/components/admin/CapabilityProfilePanel'; // v0.125.82
import { LigaturePackagingPanel }   from '@/components/admin/LigaturePackagingPanel';  // v0.125.83
import { WorkflowOrchestrationDashboard } from './WorkflowOrchestrationDashboard';
// v155: Admin create modals for dead-end buttons
import { RolesPermissionsModal, AuditLogModal, SettingsModal, type RolePermissionsInput, type SettingsInput } from './CreateModals';
// v157: Edit/Delete modals and toast notifications
import { EditRoleModal, ConfirmDeleteModal, type EditRoleInput } from './CRUDModals';
import { useToast } from '@/components/ui/Toast';
import { 
  Settings,
  Users,
  Shield,
  Database,
  Link2,
  FileCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Activity,
  Server,
  Key,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  Eye,
  Upload,
  RefreshCw,
  Zap,
  HardDrive,
  CloudOff,
  ToggleLeft,
  ToggleRight,
  Info,
  Palette,
  Sparkles,
  Brain,
  BarChart3,
  Play,
  Pause,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  Network,
  Globe,
  Menu,
  X,
  UserPlus,
  Mail,
  Copy,
  Send,
  ChevronDown,
  Search,
  MoreVertical,
  UserX,
  UserCheck
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeadClick } from '@/hooks/useDeadClick';
import { usePersonaStore } from '@/store/usePersonaStore';

// ============================================
// Admin Color Maps (v105)
// ============================================

// Integration connection status
const connectionStatusColorMap: Record<string, BadgeColor> = {
  connected: 'green',
  disconnected: 'red',
  syncing: 'amber',
  error: 'red',
};

// Integration mode (read/write permissions)
const integrationModeColorMap: Record<string, BadgeColor> = {
  'read-only': 'slate',
  'read-write': 'amber',
  primary: 'green',
};

// Audit log entry type
const auditTypeColorMap: Record<string, BadgeColor> = {
  user: 'blue',
  document: 'green',
  integration: 'purple',
  system: 'slate',
  security: 'red',
};

// Compliance/validation status
const complianceStatusColorMap: Record<string, BadgeColor> = {
  validated: 'green',
  enabled: 'blue',
  configured: 'amber',
  pending: 'amber',
  failed: 'red',
};

// User status
const userStatusColorMap: Record<string, BadgeColor> = {
  active: 'green',
  inactive: 'slate',
  pending: 'amber',
  locked: 'red',
  invited: 'blue',
};

// Ontology/terminology status
const ontologyStatusColorMap: Record<string, BadgeColor> = {
  active: 'green',
  draft: 'amber',
  deprecated: 'slate',
  updating: 'blue',
};

// System health status
const healthStatusColorMap: Record<string, BadgeColor> = {
  healthy: 'green',
  degraded: 'amber',
  down: 'red',
  maintenance: 'blue',
};

// ============================================
// Admin Badge Helper Functions (v105)
// ============================================

export const getConnectionStatusBadge = (status: string) => (
  <Badge color={connectionStatusColorMap[status] || 'slate'} size="sm" dot>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getIntegrationModeBadge = (mode: string) => {
  const labels: Record<string, string> = {
    'read-only': 'Read Only',
    'read-write': 'Read/Write',
    primary: 'Primary',
  };
  return (
    <Badge color={integrationModeColorMap[mode] || 'slate'} size="xs">
      {labels[mode] || mode}
    </Badge>
  );
};

export const getAuditTypeBadge = (type: string) => (
  <Badge color={auditTypeColorMap[type] || 'slate'} size="xs">
    {type.charAt(0).toUpperCase() + type.slice(1)}
  </Badge>
);

export const getComplianceStatusBadge = (status: string) => (
  <Badge color={complianceStatusColorMap[status] || 'slate'} size="sm">
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getUserStatusBadge = (status: string) => (
  <Badge color={userStatusColorMap[status] || 'slate'} size="sm">
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getOntologyStatusBadge = (status: string) => (
  <Badge color={ontologyStatusColorMap[status] || 'slate'} size="sm">
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

export const getHealthStatusBadge = (status: string) => (
  <Badge color={healthStatusColorMap[status] || 'slate'} size="sm" dot>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </Badge>
);

type IntegrationMode = 'read-only' | 'read-write' | 'primary';
type SystemMode = 'viewer' | 'hybrid' | 'platform';
type AdminSection = 'overview' | 'integrations' | 'users' | 'security' | 'ontology' | 'data' | 'theme' | 'ai-oversight' | 'workflow-orchestration' | 'citation-monitor' | 'health-check' | 'capability-profile' | 'packaging';

interface DataSource {
  id: string;
  name: string;
  category: 'documents' | 'clinical' | 'safety' | 'quality';
  status: 'connected' | 'disconnected' | 'syncing';
  mode: IntegrationMode;
  documents: number;
  lastSync?: string;
  authoritative: boolean;
}

interface AuditLogEntry {
  action: string;
  user: string;
  timestamp: string;
  type: 'user' | 'document' | 'system' | 'integration';
}

const dataSources: DataSource[] = [
  { id: 'veeva-vault', name: 'Veeva Vault', category: 'documents', status: 'connected', mode: 'read-write', documents: 12847, lastSync: '2 min ago', authoritative: false },
  { id: 'documentum', name: 'Documentum', category: 'documents', status: 'connected', mode: 'read-only', documents: 8234, lastSync: '15 min ago', authoritative: false },
  { id: 'ligature', name: 'Ligature Native', category: 'documents', status: 'connected', mode: 'primary', documents: 2341, authoritative: true },
  { id: 'medidata', name: 'Medidata Rave', category: 'clinical', status: 'connected', mode: 'read-only', documents: 0, lastSync: '5 min ago', authoritative: false },
  { id: 'veeva-ctms', name: 'Veeva CTMS', category: 'clinical', status: 'connected', mode: 'read-only', documents: 0, lastSync: '12 min ago', authoritative: false },
  { id: 'argus', name: 'Argus Safety', category: 'safety', status: 'connected', mode: 'read-only', documents: 0, lastSync: '3 min ago', authoritative: false },
  { id: 'veeva-qms', name: 'Veeva QMS', category: 'quality', status: 'connected', mode: 'read-only', documents: 0, lastSync: '30 min ago', authoritative: false },
  { id: 'trackwise', name: 'TrackWise', category: 'quality', status: 'disconnected', mode: 'read-only', documents: 0, authoritative: false },
];

const auditLog: AuditLogEntry[] = [
  { action: 'User logged in', user: 'J. Smith', timestamp: '2 min ago', type: 'user' },
  { action: 'Document approved: Module 2.5', user: 'Dr. Chen', timestamp: '15 min ago', type: 'document' },
  { action: 'Integration sync: Veeva Vault', user: 'System', timestamp: '18 min ago', type: 'integration' },
  { action: 'User permissions updated', user: 'Admin', timestamp: '1 hour ago', type: 'user' },
  { action: 'New submission created: LIG-2847 NDA', user: 'R. Patel', timestamp: '2 hours ago', type: 'document' },
  { action: 'System backup completed', user: 'System', timestamp: '4 hours ago', type: 'system' },
];

const systemModeDescriptions: Record<SystemMode, { title: string; description: string; icon: React.ReactNode }> = {
  viewer: {
    title: 'Viewer Mode',
    description: 'Read-only intelligence layer. Connect to existing systems, provide cross-portfolio insights without changing your document management.',
    icon: <Eye className="w-5 h-5" />,
  },
  hybrid: {
    title: 'Hybrid Mode',
    description: 'Author and orchestrate in Ligature, archive in existing systems. Best of both worlds during transition.',
    icon: <ArrowLeftRight className="w-5 h-5" />,
  },
  platform: {
    title: 'Platform Mode',
    description: 'Ligature as system of record. Full document management, authoring, submissions, and lifecycle in one validated environment.',
    icon: <Database className="w-5 h-5" />,
  },
};

export function AdminScreen() {
    const { deadClick } = useDeadClick();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);
  const scrollToSection = useCallback((section: AdminSection) => {
    setActiveSection(section);
    setTimeout(() => {
      const el = sectionRefs.current[section];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, []);
  const [systemMode, setSystemMode] = useState<SystemMode>('platform');
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);

  // v0.124.0: Persona switching — "View as" connects user rows to home screen context
  const setPersona = usePersonaStore(s => s.setPersona);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const USER_PERSONA_MAP: Record<string, string> = {
    'u1': 'vp-regulatory',   // Sarah Chen  → VP Regulatory
    'u2': 'clinical-ops',    // Marcus Johnson → Clinical Ops
    'u3': 'cmo-csuite',      // Elena Vasquez → CMO/Executive
    'u4': 'safety-pv',       // James Liu → Safety/PV
    'u5': 'quality',          // Lisa Park → Quality
  };

  // User management state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('reviewer');
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteIsDemo, setInviteIsDemo] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const ADMIN_SEED_USERS = [
    { id: 'u1', name: 'Sarah Chen', email: 'sarah.chen@ligaturerd.io', role: 'VP Regulatory Strategy', department: 'Regulatory', status: 'active', lastLogin: '2 hours ago', initials: 'SC' },
    { id: 'u2', name: 'Marcus Johnson', email: 'm.johnson@ligaturerd.io', role: 'Clinical Operations Lead', department: 'Clinical', status: 'active', lastLogin: '1 day ago', initials: 'MJ' },
    { id: 'u3', name: 'Dr. Elena Vasquez', email: 'e.vasquez@ligaturerd.io', role: 'Chief Medical Officer', department: 'Medical Affairs', status: 'active', lastLogin: '3 hours ago', initials: 'EV' },
    { id: 'u4', name: 'James Liu', email: 'j.liu@ligaturerd.io', role: 'Safety Officer', department: 'Pharmacovigilance', status: 'active', lastLogin: 'Just now', initials: 'JL' },
    { id: 'u5', name: 'Lisa Park', email: 'l.park@ligaturerd.io', role: 'Quality Reviewer', department: 'Quality', status: 'invited', lastLogin: 'Never', initials: 'LP' },
  ];

  // v0.80.2: seed users as initial state — list is never empty even if fetch fails
  const [managingUser, setManagingUser] = useState<typeof mockUsers[0] | null>(null);
  const [managingUserRole, setManagingUserRole] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [mockUsers, setMockUsers] = useState<Array<{
    id: string; name: string; email: string; role: string;
    department: string; status: string; lastLogin: string; initials: string;
  }>>(ADMIN_SEED_USERS);

  // Fetch users from server — updates the seed list with live DB data
  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    fetch('/api/users')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (!cancelled && data.users && data.users.length > 0) {
          setMockUsers(data.users);
        }
      })
      .catch((err) => {
        console.warn('[AdminScreen] Could not fetch users from server:', err);
        // Keep seed users — already set as initial state
      })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, []);
  
  // v0.3.2: Responsive layout
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  
  // v155: Modal states for dead-end buttons
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // v157: Edit/Delete modal states
  const [editingRole, setEditingRole] = useState<{ role: typeof roles[0]; index: number } | null>(null);
  const [deletingRole, setDeletingRole] = useState<{ role: typeof roles[0]; index: number } | null>(null);
  
  // v157: Toast notifications
  const toast = useToast();

  // v156: Dynamic state for roles and settings
  const [roles, setRoles] = useState<Array<{ name: string; department: string; permissions: Record<string, string> }>>([
    { name: 'Administrator', department: 'IT', permissions: { admin: 'full', regulatory: 'full', clinical: 'full', safety: 'full', quality: 'full', labeling: 'full', research: 'full', submissions: 'full' } },
    { name: 'Regulatory Lead', department: 'Regulatory', permissions: { admin: 'none', regulatory: 'full', clinical: 'view', safety: 'view', quality: 'view', labeling: 'full', research: 'view', submissions: 'full' } },
    { name: 'Clinical Monitor', department: 'Clinical', permissions: { admin: 'none', regulatory: 'view', clinical: 'full', safety: 'view', quality: 'view', labeling: 'none', research: 'view', submissions: 'view' } },
  ]);
  const [systemSettings, setSystemSettings] = useState({
    companyName: 'Ligature Therapeutics',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    sessionTimeout: 30,
    twoFactorRequired: true,
    auditRetention: 7,
    autoSave: true,
  });

  // v156: Handler for creating new roles
  // v157: Added toast notification
  const handleCreateRole = (data: RolePermissionsInput) => {
    setRoles(prev => [...prev, {
      name: data.roleName,
      department: data.department,
      permissions: (data.permissions || {}) as Record<string, string>,
    }]);
    toast.success(`Role "${data.roleName}" created successfully`);
  };

  // v156: Handler for saving settings
  // v157: Added toast notification
  const handleSaveSettings = (data: SettingsInput) => {
    setSystemSettings(prev => ({ ...prev, ...(data as any) }));
    toast.success('Settings saved successfully');
  };

  // v157: Handler for updating roles
  // v0.42.27: Extended EditRoleInput with index for array update
  const handleUpdateRole = (data: EditRoleInput & { index: number }) => {
    setRoles(prev => prev.map((r, i) => 
      i === data.index 
        ? { ...r, name: data.roleName, department: data.department }
        : r
    ));
    toast.success(`Role "${data.roleName}" updated successfully`);
  };

  // v157: Handler for deleting roles
  const handleDeleteRole = (roleData: { role: typeof roles[0]; index: number }) => {
    setRoles(prev => prev.filter((_, i) => i !== roleData.index));
    toast.success(`Role "${roleData.role.name}" deleted`);
  };

  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

  const connectedCount = dataSources.filter(s => s.status === 'connected').length;
  const totalDocuments = dataSources.reduce((acc, s) => acc + s.documents, 0);
  const ligatureDocuments = dataSources.find(s => s.id === 'ligature')?.documents || 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ScreenHeader
        moduleId="admin"
        title="Administration"
        subtitle="User management, system configuration, integrations, and ontology"
        icon={<Settings className="w-5 h-5" />}
      />
      {/* v0.3.2: Mobile header with menu toggle */}
      {isMobile && (
        <div className="flex items-center gap-3 p-4 border-b border-border bg-surface-elevated">
          <button
            onClick={() => setShowMobileSidebar(true)}
            className="p-2 rounded-lg hover:bg-surface-card text-text-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-text-primary">
            {activeSection === 'overview' ? 'Overview' : 
             activeSection === 'integrations' ? 'Integrations' :
             activeSection === 'users' ? 'Users' :
             activeSection === 'security' ? 'Security' :
             activeSection === 'ontology' ? 'Ontology' :
             activeSection === 'data' ? 'Data Management' :
             activeSection === 'theme' ? 'Theme & Branding' :
             activeSection === 'ai-oversight' ? 'AI Oversight' :
             activeSection === 'workflow-orchestration' ? 'Workflow Orchestration' :
             activeSection === 'citation-monitor' ? 'Citation Monitor' :
             activeSection === 'capability-profile' ? 'Capability Profile' :
             activeSection === 'packaging' ? 'Product Packaging' : 'Administration'}
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* v0.3.2: Mobile Sidebar Overlay */}
        {isMobile && showMobileSidebar && (
          <div className="fixed inset-0 z-50 flex">
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setShowMobileSidebar(false)} 
            />
            <aside className="relative hidden lg:flex w-64 bg-surface-elevated border-r border-border flex flex-col max-h-full">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-sm font-semibold text-text-primary">Administration</span>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <AdminSidebarContent 
                  activeSection={activeSection}
                  setActiveSection={(section) => {
                    scrollToSection(section);
                    setShowMobileSidebar(false);
                  }}
                  connectedCount={connectedCount}
                  setShowRolesModal={setShowRolesModal}
                  setShowAuditLogModal={setShowAuditLogModal}
                  setShowSettingsModal={setShowSettingsModal}
                />
              </div>
            </aside>
          </div>
        )}

        {/* Admin Sidebar - Desktop/Tablet */}
        {!isMobile && (
          <aside className={`
            ${isTablet ? 'w-48' : 'w-56'} 
            bg-surface-elevated border-r border-border 
            flex-shrink-0 flex flex-col min-h-0
          `}>
            <div className="flex-1 overflow-y-auto p-4">
              <AdminSidebarContent 
                activeSection={activeSection}
                setActiveSection={scrollToSection}
                connectedCount={connectedCount}
                setShowRolesModal={setShowRolesModal}
                setShowAuditLogModal={setShowAuditLogModal}
                setShowSettingsModal={setShowSettingsModal}
              />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <div ref={contentRef} className="flex-1 overflow-auto p-4 sm:p-6">
            {/* v117: Breadcrumb - hidden on mobile since we have header */}
            {!isMobile && (
              <Breadcrumb 
                moduleId="admin" 
                viewLabel={activeSection === 'overview' ? 'Overview' : 
                          activeSection === 'integrations' ? 'Integrations' :
                          activeSection === 'users' ? 'Users' :
                          activeSection === 'security' ? 'Security' :
                          activeSection === 'ontology' ? 'Ontology' :
                          activeSection === 'data' ? 'Data Management' :
                          activeSection === 'theme' ? 'Theme & Branding' :
                          activeSection === 'ai-oversight' ? 'AI Oversight' :
                          activeSection === 'workflow-orchestration' ? 'Workflow Orchestration' :
                          activeSection === 'citation-monitor' ? 'Citation Monitor' :
                          activeSection === 'capability-profile' ? 'Capability Profile' :
                          activeSection === 'packaging' ? 'Product Packaging' : 'Overview'}
                className="mb-4"
              />
            )}



          <div ref={el => { sectionRefs.current['overview'] = el; }} />
          {/* System Mode Selector */}
          <Card variant="elevated" padding="xl" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Deployment Mode</h3>
                <p className="text-sm text-text-muted mt-1">Configure how Ligature integrates with your existing systems</p>
              </div>
              <Button 
                onClick={() => setShowMigrationWizard(true)}
                icon={<Zap className="w-4 h-4" />}
              >
                Migration Wizard
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {(['viewer', 'hybrid', 'platform'] as SystemMode[]).map((mode) => {
                const info = systemModeDescriptions[mode];
                const isActive = systemMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setSystemMode(mode)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isActive 
                        ? 'border-accent-blue bg-accent-blue/10' 
                        : 'border-border hover:border-accent-blue/50 bg-surface-card'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      isActive ? 'bg-accent-blue text-white' : 'bg-surface text-text-muted'
                    }`}>
                      {info.icon}
                    </div>
                    <h4 className={`text-sm font-semibold mb-1 ${isActive ? 'text-accent-blue' : 'text-text-primary'}`}>
                      {info.title}
                    </h4>
                    <p className="text-xs text-text-muted">{info.description}</p>
                    {isActive && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-accent-blue">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Data Sources Table */}
          <Card variant="elevated" padding="xl" className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Data Sources</h3>
                <p className="text-sm text-text-muted mt-1">
                  {totalDocuments.toLocaleString()} total documents • {ligatureDocuments.toLocaleString()} in Ligature
                </p>
              </div>
              <Button
                onClick={() => toast.info('Admin configuration — save changes using the form fields above')}
                variant="secondary"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Sync All
              </Button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-text-muted border-b border-border">
                  <th className="pb-3 font-medium">System</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Mode</th>
                  <th className="pb-3 font-medium">Documents</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Sync</th>
                  <th className="pb-3 font-medium">Authoritative</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {dataSources.map((source) => (
                  <tr key={source.id} className="border-b border-border/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary font-medium">{source.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-text-secondary capitalize">{source.category}</td>
                    <td className="py-3">
                      {getIntegrationModeBadge(source.mode)}
                    </td>
                    <td className="py-3 text-text-secondary">
                      {source.documents > 0 ? source.documents.toLocaleString() : '—'}
                    </td>
                    <td className="py-3">
                      {getConnectionStatusBadge(source.status)}
                    </td>
                    <td className="py-3 text-text-muted text-xs">
                      {source.lastSync || '—'}
                    </td>
                    <td className="py-3">
                      {source.authoritative ? (
                        <Badge color="green" size="xs">
                          <CheckCircle className="w-3 h-3" />
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-xs text-text-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Data Flow Diagram */}
          <Card variant="elevated" padding="xl" className="mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Data Flow</h3>
            <div className="flex items-center justify-center gap-4 py-8">
              {/* External Systems */}
              <div className="flex flex-col gap-3">
                <div className="px-4 py-2 bg-surface-card rounded-lg text-sm text-text-secondary border border-border">
                  Medidata Rave
                </div>
                <div className="px-4 py-2 bg-surface-card rounded-lg text-sm text-text-secondary border border-border">
                  Veeva CTMS
                </div>
                <div className="px-4 py-2 bg-surface-card rounded-lg text-sm text-text-secondary border border-border">
                  Argus Safety
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-6 h-6 text-accent-blue" />
                <span className="text-xs text-text-muted">Read</span>
              </div>

              {/* Ligature */}
              <div className="px-8 py-6 bg-accent-blue/20 rounded-xl border-2 border-accent-blue text-center">
                <Database className="w-8 h-8 text-accent-blue mx-auto mb-2" />
                <div className="text-lg font-semibold text-accent-blue">Ligature</div>
                <div className="text-xs text-text-muted mt-1">Intelligence Layer</div>
              </div>

              {/* Bi-directional Arrow */}
              <div className="flex flex-col items-center gap-1">
                <ArrowLeftRight className="w-6 h-6 text-accent-amber" />
                <span className="text-xs text-text-muted">Sync</span>
              </div>

              {/* Document Systems */}
              <div className="flex flex-col gap-3">
                <div className="px-4 py-2 bg-accent-amber/10 rounded-lg text-sm text-accent-amber border border-accent-amber/30">
                  Veeva Vault
                </div>
                <div className="px-4 py-2 bg-surface-card rounded-lg text-sm text-text-secondary border border-border">
                  Documentum
                </div>
              </div>

              {/* Arrow to Output */}
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="w-6 h-6 text-accent-green" />
                <span className="text-xs text-text-muted">Publish</span>
              </div>

              {/* Outputs */}
              <div className="flex flex-col gap-3">
                <div className="px-4 py-2 bg-accent-green/10 rounded-lg text-sm text-accent-green border border-accent-green/30">
                  eCTD Gateway
                </div>
                <div className="px-4 py-2 bg-accent-green/10 rounded-lg text-sm text-accent-green border border-accent-green/30">
                  Health Authorities
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Security & Compliance */}
            <Card variant="elevated" padding="xl">
<div ref={el => { sectionRefs.current['security'] = el; }} />
              <h3 className="text-lg font-semibold text-text-primary mb-4">Security & Compliance</h3>
              <div className="space-y-3">
                <ComplianceItem label="21 CFR Part 11" status="validated" />
                <ComplianceItem label="SOC 2 Type II" status="validated" />
                <ComplianceItem label="SSO/SAML" status="enabled" />
                <ComplianceItem label="AES-256 Encryption" status="enabled" />
                <ComplianceItem label="Audit Logging" status="enabled" />
                <ComplianceItem label="Data Residency (EU)" status="configured" />
              </div>
            </Card>

            {/* Stats */}
            <Card variant="elevated" padding="xl">
              <h3 className="text-lg font-semibold text-text-primary mb-4">System Health</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <StatCard value="99.9%" label="Uptime" color="text-accent-green" />
                <StatCard value={connectedCount} label="Connected Systems" color="text-accent-blue" />
                <StatCard value={156} label="Active Users" color="text-accent-purple" />
                <StatCard value="23K" label="Documents" color="text-accent-amber" />
              </div>
              {/* v132: Data Integrity Widget */}
              <IntegrityWidget
                violations={[]}
                lastCheck={{
                  id: 'check-001',
                  checkedAt: new Date().toISOString(),
                  duration: 234,
                  totalEntities: 23847,
                  entitiesChecked: 23847,
                  violations: [],
                  status: 'passed',
                }}
                onRunCheck={() => {}}
              />
            </Card>

            {/* Recent Audit Log */}
            <Card variant="elevated" padding="xl" className="col-span-1 md:col-span-2">
<div ref={el => { sectionRefs.current['audit-log'] = el; }} />
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Audit Log</h3>
              <div className="space-y-2">
                {auditLog.map((entry, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 p-3 bg-surface-card rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      entry.type === 'user' ? 'bg-accent-blue/20 text-accent-blue' :
                      entry.type === 'document' ? 'bg-accent-green/20 text-accent-green' :
                      entry.type === 'integration' ? 'bg-accent-purple/20 text-accent-purple' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {entry.type === 'user' && <Users className="w-4 h-4" />}
                      {entry.type === 'document' && <FileCheck className="w-4 h-4" />}
                      {entry.type === 'integration' && <Link2 className="w-4 h-4" />}
                      {entry.type === 'system' && <Server className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary">{entry.action}</div>
                      <div className="text-xs text-text-muted">{entry.user}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAuditTypeBadge(entry.type)}
                      <span className="text-xs text-text-muted">{entry.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Ontology Section */}
          {activeSection === 'ontology' && (
            <div className="max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">Ontology Management</h1>
                  <p className="text-sm text-text-muted mt-1">Configure controlled vocabularies and terminology standards</p>
                </div>
              </div>

              {/* Ontology Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                {/* MedDRA */}
                <Card variant="elevated" padding="xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-red/20 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-accent-red" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">MedDRA</h3>
                        <p className="text-xs text-text-muted">Medical Dictionary for Regulatory Activities</p>
                      </div>
                    </div>
                    <Badge color="green" size="sm">v27.0</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">System Organ Classes</span><span className="text-text-primary">27</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">High Level Group Terms</span><span className="text-text-primary">337</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">High Level Terms</span><span className="text-text-primary">1,739</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Preferred Terms</span><span className="text-text-primary">86,532</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Lowest Level Terms</span><span className="text-text-primary">91,824</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted">Last updated: Nov 2024</span>
                    <Button variant="ghost" size="xs" onClick={() => toast.info('Admin configuration — save changes using the form fields above')}>Update</Button>
                  </div>
                </Card>

                {/* WHO Drug Dictionary */}
                <Card variant="elevated" padding="xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-accent-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">WHO Drug Dictionary</h3>
                        <p className="text-xs text-text-muted">World Health Organization Drug Dictionary</p>
                      </div>
                    </div>
                    <Badge color="green" size="sm">2024Q3</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Drug Records</span><span className="text-text-primary">245,000+</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">ATC Codes</span><span className="text-text-primary">6,331</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Countries Covered</span><span className="text-text-primary">150+</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted">Last updated: Sep 2024</span>
                    <Button variant="ghost" size="xs" onClick={() => toast.info('Admin configuration — save changes using the form fields above')}>Update</Button>
                  </div>
                </Card>

                {/* SNOMED CT */}
                <Card variant="elevated" padding="xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-accent-purple" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">SNOMED CT</h3>
                        <p className="text-xs text-text-muted">Systematized Nomenclature of Medicine</p>
                      </div>
                    </div>
                    <Badge color="green" size="sm">Jul 2024</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Concepts</span><span className="text-text-primary">360,000+</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Descriptions</span><span className="text-text-primary">1.5M+</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Relationships</span><span className="text-text-primary">1.8M+</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted">Last updated: Jul 2024</span>
                    <Button variant="ghost" size="xs" onClick={() => toast.info('Admin configuration — save changes using the form fields above')}>Update</Button>
                  </div>
                </Card>

                {/* ICD-11 */}
                <Card variant="elevated" padding="xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-amber/20 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-accent-amber" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">ICD-11</h3>
                        <p className="text-xs text-text-muted">International Classification of Diseases</p>
                      </div>
                    </div>
                    <Badge color="green" size="sm">2024</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-text-muted">Entities</span><span className="text-text-primary">17,000+</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Foundation Entities</span><span className="text-text-primary">80,000+</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Chapters</span><span className="text-text-primary">26</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-text-muted">Last updated: Jan 2024</span>
                    <Button variant="ghost" size="xs" onClick={() => toast.info('Admin configuration — save changes using the form fields above')}>Update</Button>
                  </div>
                </Card>
              </div>

              {/* Custom Ontologies */}
              <Card variant="elevated" padding="xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">Custom Terminologies</h3>
                  <Button icon={<Plus className="w-4 h-4" onClick={() => toast.info('Admin configuration — save changes using the form fields above')} />}>
                    Add Custom
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-text-muted border-b border-border">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Terms</th>
                      <th className="pb-3 font-medium">Used In</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-3 text-text-primary font-medium">Company Product Names</td>
                      <td className="py-3 text-text-secondary">Product</td>
                      <td className="py-3 text-text-secondary">23</td>
                      <td className="py-3 text-text-secondary">All modules</td>
                      <td className="py-3">{getOntologyStatusBadge('active')}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 text-text-primary font-medium">Study Identifiers</td>
                      <td className="py-3 text-text-secondary">Study</td>
                      <td className="py-3 text-text-secondary">47</td>
                      <td className="py-3 text-text-secondary">Development, Safety</td>
                      <td className="py-3">{getOntologyStatusBadge('active')}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 text-text-primary font-medium">Regulatory Submission Types</td>
                      <td className="py-3 text-text-secondary">Submission</td>
                      <td className="py-3 text-text-secondary">35</td>
                      <td className="py-3 text-text-secondary">Submissions, HAQ</td>
                      <td className="py-3">{getOntologyStatusBadge('active')}</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-3 text-text-primary font-medium">Internal Dose Forms</td>
                      <td className="py-3 text-text-secondary">CMC</td>
                      <td className="py-3 text-text-secondary">12</td>
                      <td className="py-3 text-text-secondary">CMC, Labeling</td>
                      <td className="py-3">{getOntologyStatusBadge('draft')}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* Theme Settings Section */}
          {activeSection === 'theme' && (
            <ThemeSettingsPanel />
          )}

          {/* AI Oversight Section */}
          {activeSection === 'ai-oversight' && (
            <AIAdminPanel />
          )}

          {/* v189: Workflow Orchestration Section */}
          {activeSection === 'workflow-orchestration' && (
            <WorkflowOrchestrationDashboard />
          )}

          {/* Data Management Section */}
          {activeSection === 'data' && (
            <DataManagementPanel />
          )}

          {/* v0.45.2: Citation Monitor Section */}
          {activeSection === 'health-check' && (
            <PlatformHealthCheck />
          )}
          {activeSection === 'capability-profile' && (
            <div className="p-6"><CapabilityProfilePanel /></div>
          )}
          {activeSection === 'packaging' && (
            <div className="p-6"><LigaturePackagingPanel /></div>
          )}
          {activeSection === 'citation-monitor' && (
            <div className="max-w-5xl">
              <CitationMonitorPanel />
            </div>
          )}

          {/* v0.58.0: User Management Section */}
          {activeSection === 'users' && (
            <div className="max-w-5xl space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <div>
    <div ref={el => { sectionRefs.current['users'] = el; }} />
                  <h1 className="text-2xl font-semibold text-text-primary">User Management</h1>
                  <p className="text-sm text-text-muted mt-1">Manage users, roles, and access permissions</p>
                </div>
                <button
                  onClick={() => { setShowInviteModal(true); setInviteSent(false); setInviteEmail(''); setInviteLink(''); setInviteError(''); setInviteIsDemo(false); }}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite User
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Users', value: mockUsers.length, color: 'text-text-primary' },
                  { label: 'Active', value: mockUsers.filter(u => u.status === 'active').length, color: 'text-accent-green' },
                  { label: 'Pending Invite', value: mockUsers.filter(u => u.status === 'invited').length, color: 'text-accent-amber' },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface-card border border-border rounded-xl p-4">
                    <div className={`text-2xl font-bold ${stat?.color ?? ''}`}>{stat.value}</div>
                    <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* User table */}
              <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs font-medium text-text-muted uppercase tracking-wide bg-surface px-4 py-2 border-b border-border">
                  <div className="w-8" />
                  <div>User</div>
                  <div className="w-32 text-center">Role</div>
                  <div className="w-24 text-center">Status</div>
                  <div className="w-8" />
                </div>
                <div className="divide-y divide-border">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8 text-text-muted text-sm gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Loading users…
                    </div>
                  ) : mockUsers
                    .filter(u => !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                    .map(user => {
                    const mappedPersona = USER_PERSONA_MAP[user.id];
                    const isViewingAs = mappedPersona && activePersonaId === mappedPersona;
                    return (
                    <div key={user.id} className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-3 hover:bg-surface transition-colors ${isViewingAs ? 'bg-accent-blue/5 ring-1 ring-inset ring-accent-blue/20' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${isViewingAs ? 'bg-accent-blue/20 ring-2 ring-accent-blue/40' : 'bg-accent-blue/10'}`}>
                        <span className="text-xs font-semibold text-accent-blue">{user.initials}</span>
                      </div>
                      {/* Name / email */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
                          {isViewingAs && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-semibold flex-shrink-0">Viewing as</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted truncate">{user.email}</div>
                        <div className="text-xs text-text-muted mt-0.5">Last login: {user.lastLogin}</div>
                      </div>
                      {/* Role */}
                      <div className="w-32 text-center">
                        <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-lg border border-border truncate block mx-2">
                          {user.role.split(' ').slice(-1)[0]}
                        </span>
                      </div>
                      {/* Status badge */}
                      <div className="w-24 flex justify-center">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.status === 'active' 
                            ? 'bg-accent-green/10 text-accent-green' 
                            : 'bg-accent-amber/10 text-accent-amber'
                        }`}>
                          {user.status === 'active' ? 'Active' : 'Invited'}
                        </span>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 pl-2">
                        {/* v0.124.0: "View as" — switches platform persona to this user's role */}
                        {mappedPersona && user.status === 'active' && (
                          <button
                            onClick={() => {
                              setPersona(mappedPersona);
                              toast.success(`Viewing as ${user.name} — home screen updated`);
                            }}
                            className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isViewingAs
                                ? 'bg-accent-blue/20 text-accent-blue'
                                : 'text-text-muted hover:text-accent-blue hover:bg-accent-blue/10'
                            }`}
                            title={`Switch to ${user.name}'s persona`}
                          >
                            {isViewingAs ? '✓ Active' : 'View as'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (user.status === 'invited') {
                              setMockUsers(prev => prev.filter(u => u.id !== user.id));
                              toast.success(`Invite revoked for ${user.name}`);
                            } else {
                              // v0.59.0: open manage modal
                              setManagingUser(user);
                              setManagingUserRole(user.role);
                            }
                          }}
                          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* v0.58.0: Invite User Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent-blue/10 rounded-lg flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-accent-blue" />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary">Invite User</h3>
                  </div>
                  <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {!inviteSent ? (
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Role</label>
                      <select
                        value={inviteRole}
                        onChange={e => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                      >
                        <option value="reviewer">Reviewer — view & comment only</option>
                        <option value="author">Author — create & edit documents</option>
                        <option value="approver">Approver — approve & sign off</option>
                        <option value="submission-manager">Submission Manager — full submission access</option>
                        <option value="admin">Administrator — full platform access</option>
                      </select>
                    </div>

                    <div className="bg-surface-card border border-border rounded-lg p-3 text-xs text-text-muted">
                      <span className="font-medium text-text-secondary">Role permissions: </span>
                      {inviteRole === 'reviewer' && 'Can view all modules, add comments. Cannot create, edit, or approve content.'}
                      {inviteRole === 'author' && 'Can create and edit documents in assigned modules. Cannot approve or submit.'}
                      {inviteRole === 'approver' && 'Can review, approve, and digitally sign documents. Cannot edit content directly.'}
                      {inviteRole === 'submission-manager' && 'Full access to submission planning, eCTD building, and regulatory workflows.'}
                      {inviteRole === 'admin' && 'Full platform access including user management, configuration, and audit logs.'}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          if (!inviteEmail) { toast.error('Please enter an email address'); return; }
                          setInviteLoading(true);
                          setInviteError('');
                          try {
                            const res = await fetch('/api/users/invite', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: inviteEmail, role: inviteRole, invitedBy: 'Sarah Chen' }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setInviteError(data.error || 'Failed to send invitation. Please try again.');
                            } else {
                              setInviteLink(data.inviteLink);
                              setInviteIsDemo(data.demo === true);
                              setInviteSent(true);
                              // v0.80.2: re-fetch from server so the list persists across navigation
                              fetch('/api/users')
                                .then(r => r.ok ? r.json() : Promise.reject(r.status))
                                .then(d => { if (d.users && d.users.length > 0) setMockUsers(d.users); })
                                .catch(() => {
                                  // Fallback: patch local state optimistically
                                  const roleLabel = inviteRole.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                  setMockUsers(prev => [...prev, {
                                    id: `u${Date.now()}`,
                                    name: inviteEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                                    email: inviteEmail,
                                    role: roleLabel,
                                    department: 'Pending',
                                    status: 'invited',
                                    lastLogin: 'Never',
                                    initials: inviteEmail.slice(0, 2).toUpperCase(),
                                  }]);
                                });
                            }
                          } catch {
                            setInviteError('Network error — please check your connection and try again.');
                          } finally {
                            setInviteLoading(false);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={inviteLoading}
                      >
                        {inviteLoading ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Invite
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="px-4 py-2.5 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-card transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {inviteError && (
                      <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col items-center text-center py-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${inviteIsDemo ? 'bg-violet-100' : 'bg-accent-green/10'}`}>
                        <CheckCircle className={`w-6 h-6 ${inviteIsDemo ? 'text-violet-500' : 'text-accent-green'}`} />
                      </div>
                      <h4 className="text-base font-semibold text-text-primary mb-1">
                        {inviteIsDemo ? 'Invite created (Demo Mode)' : 'Invite sent!'}
                      </h4>
                      {inviteIsDemo ? (
                        <div className="text-sm text-text-muted space-y-1">
                          <p>No email was sent — the app is running in <span className="font-medium text-violet-600">Demo Mode</span> without an email provider configured.</p>
                          <p className="text-xs mt-2">Share the invite link below directly with <span className="font-medium text-text-primary">{inviteEmail}</span>.</p>
                          <p className="text-xs text-text-muted mt-1">To enable real invite emails, add <code className="bg-surface-card px-1 rounded">RESEND_API_KEY</code> to your Vercel environment variables.</p>
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted">An invitation email has been sent to <span className="font-medium text-text-primary">{inviteEmail}</span></p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Or share invite link directly</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-surface-card border border-border rounded-lg text-xs text-text-secondary font-mono truncate">
                          {inviteLink}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(inviteLink).catch(() => {});
                            toast.success('Link copied to clipboard');
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-surface-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors flex-shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setInviteEmail(''); setInviteRole('reviewer'); setInviteSent(false); setInviteLink(''); setInviteError(''); setInviteIsDemo(false); }}
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-surface-card border border-border text-text-secondary rounded-lg hover:bg-surface-elevated transition-colors"
                      >
                        Invite Another
                      </button>
                      <button
                        onClick={() => setShowInviteModal(false)}
                        className="flex-1 px-4 py-2.5 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* v0.59.0: Manage User Modal — role editing + deactivate/reactivate */}
          {managingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-surface-card border border-border rounded-full flex items-center justify-center font-semibold text-sm text-text-secondary">
                      {managingUser.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">{managingUser.name}</div>
                      <div className="text-xs text-text-muted">{managingUser.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setManagingUser(null)} className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      managingUser.status === 'active'
                        ? 'bg-accent-green/10 text-accent-green'
                        : managingUser.status === 'deactivated'
                          ? 'bg-surface-card text-text-muted border border-border'
                          : 'bg-accent-amber/10 text-accent-amber'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        managingUser.status === 'active' ? 'bg-accent-green' : managingUser.status === 'deactivated' ? 'bg-text-muted' : 'bg-accent-amber'
                      }`} />
                      {managingUser.status === 'active' ? 'Active' : managingUser.status === 'deactivated' ? 'Deactivated' : 'Invited'}
                    </span>
                    <span className="text-xs text-text-muted">Last login: {managingUser.lastLogin}</span>
                  </div>

                  {/* Role edit */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Role</label>
                    <input
                      type="text"
                      value={managingUserRole}
                      onChange={e => setManagingUserRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                      placeholder="e.g. Regulatory Affairs Lead"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Department</label>
                    <select
                      defaultValue={managingUser.department}
                      onChange={e => setManagingUser(prev => prev ? { ...prev, department: e.target.value } : null)}
                      className="w-full px-4 py-2.5 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
                    >
                      {['Regulatory', 'Clinical', 'Safety', 'Quality', 'CMC', 'Medical Affairs', 'IT'].map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-5 border-t border-border space-y-3">
                  {/* Save role */}
                  <button
                    onClick={() => {
                      setMockUsers(prev => prev.map(u =>
                        u.id === managingUser.id ? { ...u, role: managingUserRole } : u
                      ));
                      toast.success(`Role updated for ${managingUser.name}`);
                      setManagingUser(null);
                    }}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                  >
                    Save Changes
                  </button>

                  {/* Deactivate / Reactivate */}
                  {managingUser.status === 'active' ? (
                    <button
                      onClick={() => {
                        setMockUsers(prev => prev.map(u =>
                          u.id === managingUser.id ? { ...u, status: 'deactivated' } : u
                        ));
                        toast.success(`${managingUser.name} deactivated — access revoked`);
                        setManagingUser(null);
                      }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-accent-red border border-accent-red/30 bg-accent-red/5 rounded-lg hover:bg-accent-red/10 transition-colors"
                    >
                      Deactivate Account
                    </button>
                  ) : managingUser.status === 'deactivated' ? (
                    <button
                      onClick={() => {
                        setMockUsers(prev => prev.map(u =>
                          u.id === managingUser.id ? { ...u, status: 'active' } : u
                        ));
                        toast.success(`${managingUser.name} reactivated`);
                        setManagingUser(null);
                      }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-accent-green border border-accent-green/30 bg-accent-green/5 rounded-lg hover:bg-accent-green/10 transition-colors"
                    >
                      Reactivate Account
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Migration Wizard Modal */}
          {showMigrationWizard && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-surface-elevated rounded-xl p-6 w-[600px] max-h-[80vh] overflow-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                  <h3 className="text-lg font-semibold text-text-primary">Migration Wizard</h3>
                  <button 
                    onClick={() => setShowMigrationWizard(false)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-accent-blue mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-accent-blue">Migration Assessment</h4>
                        <p className="text-sm text-text-secondary mt-1">
                          Based on your current configuration, here's what it would take to make Ligature your system of record.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-text-primary">Veeva Vault Documents</div>
                        <div className="text-xs text-text-muted">12,847 documents to migrate</div>
                      </div>
                      <Badge color="amber" size="sm">~2 weeks</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-text-primary">Documentum Archive</div>
                        <div className="text-xs text-text-muted">8,234 documents to migrate</div>
                      </div>
                      <Badge color="amber" size="sm">~1 week</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-text-primary">User Training</div>
                        <div className="text-xs text-text-muted">156 users across 12 departments</div>
                      </div>
                      <Badge color="blue" size="sm">~3 weeks</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <div>
                        <div className="text-sm font-medium text-text-primary">Validation</div>
                        <div className="text-xs text-text-muted">IQ/OQ/PQ protocols</div>
                      </div>
                      <Badge color="purple" size="sm">~4 weeks</Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-card rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">Estimated Total Timeline</span>
                      <span className="text-lg font-bold text-accent-green">10-12 weeks</span>
                    </div>
                    <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button 
                      variant="secondary"
                      onClick={() => setShowMigrationWizard(false)}
                      fullWidth
                    >
                      Close
                    </Button>
                    <Button fullWidth onClick={() => toast.info('Admin configuration — save changes using the form fields above')}>
                      Start Migration Plan
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      
      {/* v155: Admin Modals */}
      {/* v156: Wired to actual handlers that update state */}
      <RolesPermissionsModal 
        isOpen={showRolesModal} 
        onClose={() => setShowRolesModal(false)} 
        onCreate={handleCreateRole} 
      />
      <AuditLogModal 
        isOpen={showAuditLogModal} 
        onClose={() => setShowAuditLogModal(false)} 
      />
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
        onSave={handleSaveSettings} 
      />

      {/* v157: Edit/Delete Modals (for roles once a roles listing is added) */}
      <EditRoleModal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        onSave={handleUpdateRole}
        role={editingRole?.role || null}
        roleIndex={editingRole?.index || 0}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingRole}
        onClose={() => setDeletingRole(null)}
        onConfirm={() => deletingRole && handleDeleteRole(deletingRole)}
        itemType="Role"
        itemName={deletingRole?.role.name || ''}
      />
    </div>
  );
}

// v0.3.2: Extracted sidebar content for reuse in mobile/desktop
function AdminSidebarContent({
  activeSection,
  setActiveSection,
  connectedCount,
  setShowRolesModal,
  setShowAuditLogModal,
  setShowSettingsModal,
}: {
  activeSection: AdminSection;
  setActiveSection: (section: AdminSection) => void;
  connectedCount: number;
  setShowRolesModal: (show: boolean) => void;
  setShowAuditLogModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
}) {
  return (
    <>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">System</h2>
      <nav className="space-y-1">
        <AdminNavItem 
          icon={<Activity className="w-4 h-4" />}
          label="Overview"
          active={activeSection === 'overview'}
          onClick={() => setActiveSection('overview')}
        />
        <AdminNavItem 
          icon={<Link2 className="w-4 h-4" />}
          label="Integrations"
          count={connectedCount}
          active={activeSection === 'integrations'}
          onClick={() => setActiveSection('integrations')}
        />
        <AdminNavItem 
          icon={<Shield className="w-4 h-4" />}
          label="Security"
          active={activeSection === 'security'}
          onClick={() => setActiveSection('security')}
        />
      </nav>
      
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mt-8 mb-4">Users</h2>
      <nav className="space-y-1">
        <AdminNavItem 
          icon={<Users className="w-4 h-4" />}
          label="Users"
          count={156}
          active={activeSection === 'users'}
          onClick={() => setActiveSection('users')}
        />
        <AdminNavItem 
          icon={<Key className="w-4 h-4" />}
          label="Roles & Permissions"
          onClick={() => setShowRolesModal(true)}
        />
        <AdminNavItem 
          icon={<FileCheck className="w-4 h-4" />}
          label="Audit Log"
          onClick={() => setShowAuditLogModal(true)}
        />
      </nav>
      
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mt-8 mb-4">Configuration</h2>
      <nav className="space-y-1">
        <AdminNavItem 
          icon={<Network className="w-4 h-4" />}
          label="Workflow Orchestration"
          active={activeSection === 'workflow-orchestration'}
          onClick={() => setActiveSection('workflow-orchestration')}
        />
        <AdminNavItem 
          icon={<Palette className="w-4 h-4" />}
          label="Theme & Branding"
          active={activeSection === 'theme'}
          onClick={() => setActiveSection('theme')}
        />
        <AdminNavItem 
          icon={<Sparkles className="w-4 h-4" />}
          label="AI Oversight"
          active={activeSection === 'ai-oversight'}
          onClick={() => setActiveSection('ai-oversight')}
        />
        <AdminNavItem 
          icon={<HardDrive className="w-4 h-4" />}
          label="Data Management"
          active={activeSection === 'data'}
          onClick={() => setActiveSection('data')}
        />
        <AdminNavItem 
          icon={<Globe className="w-4 h-4" />}
          label="Citation Monitor"
          active={activeSection === 'citation-monitor'}
          onClick={() => setActiveSection('citation-monitor')}
        />
        <AdminNavItem
          label="Health Check"
          icon={<span className="text-base">🩺</span>}
          active={activeSection === 'health-check'}
          onClick={() => setActiveSection('health-check')}
        />
        <AdminNavItem
          label="Capability Profile"
          icon={<span className="text-base">📊</span>}
          active={activeSection === 'capability-profile'}
          onClick={() => setActiveSection('capability-profile')}
        />
        <AdminNavItem
          label="Product Packaging"
          icon={<span className="text-base">📦</span>}
          active={activeSection === 'packaging'}
          onClick={() => setActiveSection('packaging')}
        />
        <AdminNavItem 
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          onClick={() => setShowSettingsModal(true)}
        />
        <AdminNavItem 
          icon={<Layers className="w-4 h-4" />}
          label="Ontology"
          active={activeSection === 'ontology'}
          onClick={() => setActiveSection('ontology')}
        />
      </nav>
    </>
  );
}

function AdminNavItem({ 
  icon, 
  label, 
  count, 
  active = false, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
        active 
          ? 'bg-slate-500/20 text-slate-300' 
          : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-text-muted">{count}</span>
      )}
    </button>
  );
}

function ComplianceItem({ label, status }: { label: string; status: 'validated' | 'enabled' | 'configured' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
      <span className="text-sm text-text-primary">{label}</span>
      {getComplianceStatusBadge(status)}
    </div>
  );
}
