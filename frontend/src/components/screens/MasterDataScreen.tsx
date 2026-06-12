

// v130: Loading state imports
import { Spinner } from '@/components/ui/Spinner';

import { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  MapPin,
  Package,
  Search,
  Plus,
  Filter,
  ChevronRight,
  Mail,
  Phone,
  Globe,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Edit,
  Trash2,
  ExternalLink,
  Building,
  Beaker,
  Award,
  FileText,
  RefreshCw,
  Database
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useMasterDataStore } from '@/store/useMasterDataStore';
import type { Organization, Contact, Site, Product, DataQualityLevel, EntityStatus } from '@/store/masterDataTypes';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useDeadClick } from '@/hooks/useDeadClick';

type MDMTab = 'organizations' | 'contacts' | 'sites' | 'products';

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface MasterDataScreenProps {
  filters: FilterState;
}

// Color maps for standardized badge colors
const qualityLevelColorMap: Record<DataQualityLevel, string> = {
  gold: 'amber',
  silver: 'slate',
  bronze: 'orange',
  unverified: 'slate'
};

const entityStatusColorMap: Record<EntityStatus, string> = {
  'draft': 'slate',
  'pending-review': 'amber',
  'active': 'green',
  'inactive': 'slate',
  'deprecated': 'red',
  'merged': 'purple',
  'archived': 'slate'
};

// Badge helper functions
export const getQualityLevelBadge = (level: DataQualityLevel) => {
  const labels: Record<DataQualityLevel, string> = {
    gold: 'Gold',
    silver: 'Silver',
    bronze: 'Bronze',
    unverified: 'Unverified'
  };
  return (
    <Badge color={qualityLevelColorMap[level] as 'amber' | 'slate' | 'orange'} size="sm">
      {labels[level]}
    </Badge>
  );
};

export const getEntityStatusBadge = (status: EntityStatus) => {
  const labels: Record<EntityStatus, string> = {
    'draft': 'Draft',
    'pending-review': 'Pending Review',
    'active': 'Active',
    'inactive': 'Inactive',
    'deprecated': 'Deprecated',
    'merged': 'Merged',
    'archived': 'Archived'
  };
  return (
    <Badge color={entityStatusColorMap[status] as 'slate' | 'amber' | 'green' | 'red' | 'purple'} size="sm">
      {labels[status]}
    </Badge>
  );
};

export function MasterDataScreen({ filters }: MasterDataScreenProps) {
    const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<MDMTab>('organizations');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // v130: Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  // Use stable selectors - access the record directly, not Object.values()
  const organizationsRecord = useMasterDataStore(s => s.organizations);
  const contactsRecord = useMasterDataStore(s => s.contacts);
  const sitesRecord = useMasterDataStore(s => s.sites);
  const productsRecord = useMasterDataStore(s => s.products);
  const analytics = useMasterDataStore(s => s.analytics);
  const loadMockData = useMasterDataStore(s => s.loadMockData);

  // Convert to arrays in render (not in selector)
  const organizations = Object.values(organizationsRecord);
  const contacts = Object.values(contactsRecord);
  const sites = Object.values(sitesRecord);
  const products = Object.values(productsRecord);

  // Load mock data on button click instead of auto-load
  const handleLoadData = () => {
    if (organizations.length === 0) {
      loadMockData();
    }
  };

  const tabs: { id: MDMTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'organizations', label: 'Organizations', icon: <Building2 className="w-4 h-4" />, count: organizations.length },
    { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" />, count: contacts.length },
    { id: 'sites', label: 'Sites', icon: <MapPin className="w-4 h-4" />, count: sites.length },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" />, count: products.length },
  ];

  // Use module-level badge helpers
  const getQualityBadge = getQualityLevelBadge;
  const getStatusBadge = getEntityStatusBadge;

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.legalName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.primaryEmail?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // v130: Loading state render
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-text-muted">Loading master data...</span></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <ScreenHeader
        moduleId="master-data"
        title="Master Data Management"
        subtitle="Enterprise data governance — organizations, sites, contacts, and product master records"
        icon={<Database className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleLoadData} icon={<RefreshCw className="w-4 h-4" />}>
              {organizations.length === 0 ? 'Load Data' : 'Sync All'}
            </Button>

            <CapabilityGate moduleId="master-data" capability="author" inline>
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" onClick={() => toast.success('Master data record updated')} />}>
                  New Entity
                </Button>
              </CapabilityGate>
          </div>
        }
      >
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4">
          <StatCard 
            label="Total Entities" 
            value={organizations.length + contacts.length + sites.length + products.length} 
            icon={<Database className="w-4 h-4" />}
            color="blue"
          />
          <StatCard 
            label="Gold Quality" 
            value={[...organizations, ...contacts, ...sites, ...products].filter(e => e.qualityLevel === 'gold').length} 
            icon={<Star className="w-4 h-4" />}
            color="yellow"
          />
          <StatCard 
            label="Active" 
            value={[...organizations, ...contacts, ...sites, ...products].filter(e => e.status === 'active').length} 
            icon={<CheckCircle className="w-4 h-4" />}
            color="green"
          />
          <StatCard 
            label="Pending Review" 
            value={[...organizations, ...contacts, ...sites, ...products].filter(e => e.status === 'pending-review').length} 
            icon={<Clock className="w-4 h-4" />}
            color="amber"
          />
          <StatCard 
            label="Quality Score" 
            value={analytics?.overallQualityScore ? `${analytics.overallQualityScore}%` : '85%'} 
            icon={<BarChart3 className="w-4 h-4" />}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                activeTab === tab.id ? 'bg-accent-blue/20' : 'bg-surface-card'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </ScreenHeader>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List Panel */}

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed left-3 top-16 z-30 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg text-text-secondary hover:text-text-primary"
              aria-label="Open Data Browser"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            </button>
            {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}
        <div className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} w-[400px] border-r border-border flex flex-col`}>
          {/* Search */}
          <div className="p-4 border-b border-border">
            <SearchInput
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'organizations' && (
              <OrganizationList 
                organizations={filteredOrganizations} 
                selectedId={selectedId}
                onSelect={setSelectedId}
                getQualityBadge={getQualityBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
            {activeTab === 'contacts' && (
              <ContactList 
                contacts={filteredContacts}
                selectedId={selectedId}
                onSelect={setSelectedId}
                getQualityBadge={getQualityBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
            {activeTab === 'sites' && (
              <SiteList 
                sites={filteredSites}
                selectedId={selectedId}
                onSelect={setSelectedId}
                getQualityBadge={getQualityBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
            {activeTab === 'products' && (
              <ProductList 
                products={filteredProducts}
                selectedId={selectedId}
                onSelect={setSelectedId}
                getQualityBadge={getQualityBadge}
                getStatusBadge={getStatusBadge}
              />
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-surface p-6">
          {selectedId ? (
            <>
              {activeTab === 'organizations' && (
                <OrganizationDetail 
                  organization={organizations.find(o => o.id === selectedId)!}
                  getQualityBadge={getQualityBadge}
                  getStatusBadge={getStatusBadge}
                />
              )}
              {activeTab === 'contacts' && (
                <ContactDetail 
                  contact={contacts.find(c => c.id === selectedId)!}
                  getQualityBadge={getQualityBadge}
                  getStatusBadge={getStatusBadge}
                />
              )}
              {activeTab === 'sites' && (
                <SiteDetail 
                  site={sites.find(s => s.id === selectedId)!}
                  getQualityBadge={getQualityBadge}
                  getStatusBadge={getStatusBadge}
                />
              )}
              {activeTab === 'products' && (
                <ProductDetail 
                  product={products.find(p => p.id === selectedId)!}
                  getQualityBadge={getQualityBadge}
                  getStatusBadge={getStatusBadge}
                />
              )}
            </>
          ) : (
            <EmptyState activeTab={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

function OrganizationList({ organizations, selectedId, onSelect, getQualityBadge, getStatusBadge }: { 
  organizations: Organization[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="divide-y divide-border">
      {organizations.map(org => (
        <button
          key={org.id}
          onClick={() => onSelect(org.id)}
          className={`w-full p-4 text-left hover:bg-surface-card transition-colors ${
            selectedId === org.id ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-text-muted" />
              <span className="font-medium text-text-primary">{org.name}</span>
            </div>
            {getQualityBadge(org.qualityLevel)}
          </div>
          <div className="text-xs text-text-muted mb-2">{org.organizationId}</div>
          <div className="flex items-center gap-2 text-xs">
            {getStatusBadge(org.status)}
            <span className="text-text-muted">{org.organizationType}</span>
          </div>
        </button>
      ))}
      {organizations.length === 0 && (
        <div className="p-8 text-center text-text-muted">No organizations found</div>
      )}
    </div>
  );
}

function ContactList({ contacts, selectedId, onSelect, getQualityBadge, getStatusBadge }: { 
  contacts: Contact[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="divide-y divide-border">
      {contacts.map(contact => (
        <button
          key={contact.id}
          onClick={() => onSelect(contact.id)}
          className={`w-full p-4 text-left hover:bg-surface-card transition-colors ${
            selectedId === contact.id ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <span className="font-medium text-text-primary">{contact.displayName}</span>
            {getQualityBadge(contact.qualityLevel)}
          </div>
          <div className="text-xs text-text-muted mb-1">{contact.jobTitle || 'No title'}</div>
          <div className="text-xs text-text-muted mb-2">{contact.organizationName || 'No organization'}</div>
          <div className="flex items-center gap-2 text-xs">
            {getStatusBadge(contact.status)}
            {contact.primaryEmail && (
              <span className="text-text-muted flex items-center gap-1">
                <Mail className="w-3 h-3" /> {contact.primaryEmail}
              </span>
            )}
          </div>
        </button>
      ))}
      {contacts.length === 0 && (
        <div className="p-8 text-center text-text-muted">No contacts found</div>
      )}
    </div>
  );
}

function SiteList({ sites, selectedId, onSelect, getQualityBadge, getStatusBadge }: { 
  sites: Site[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="divide-y divide-border">
      {sites.map(site => (
        <button
          key={site.id}
          onClick={() => onSelect(site.id)}
          className={`w-full p-4 text-left hover:bg-surface-card transition-colors ${
            selectedId === site.id ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-text-muted" />
              <span className="font-medium text-text-primary">{site.name}</span>
            </div>
            {getQualityBadge(site.qualityLevel)}
          </div>
          <div className="text-xs text-text-muted mb-1">{site.siteId}</div>
          <div className="text-xs text-text-muted mb-2">{site.address.city}, {site.address.countryName}</div>
          <div className="flex items-center gap-2 text-xs">
            {getStatusBadge(site.status)}
            <span className={`px-2 py-0.5 rounded ${
              site.qualificationStatus === 'qualified' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
            }`}>
              {site.qualificationStatus}
            </span>
          </div>
        </button>
      ))}
      {sites.length === 0 && (
        <div className="p-8 text-center text-text-muted">No sites found</div>
      )}
    </div>
  );
}

function ProductList({ products, selectedId, onSelect, getQualityBadge, getStatusBadge }: { 
  products: Product[]; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="divide-y divide-border">
      {products.map(product => (
        <button
          key={product.id}
          onClick={() => onSelect(product.id)}
          className={`w-full p-4 text-left hover:bg-surface-card transition-colors ${
            selectedId === product.id ? 'bg-accent-blue/10 border-l-2 border-accent-blue' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-text-muted" />
              <span className="font-medium text-text-primary">{product.productName}</span>
            </div>
            {getQualityBadge(product.qualityLevel)}
          </div>
          <div className="text-xs text-text-muted mb-1">{product.productId}</div>
          <div className="text-xs text-text-muted mb-2">{product.genericName || 'Generic name not specified'}</div>
          <div className="flex items-center gap-2 text-xs">
            {getStatusBadge(product.status)}
            <span className="bg-accent-teal/20 text-accent-teal px-2 py-0.5 rounded">
              {product.developmentPhase}
            </span>
          </div>
        </button>
      ))}
      {products.length === 0 && (
        <div className="p-8 text-center text-text-muted">No products found</div>
      )}
    </div>
  );
}

function OrganizationDetail({ organization, getQualityBadge, getStatusBadge }: { 
  organization: Organization;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-blue/20 rounded-xl">
            <Building2 className="w-6 h-6 text-accent-blue" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{organization.name}</h2>
            <p className="text-sm text-text-muted">{organization.organizationId} • {organization.legalName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(organization.status)}
          {getQualityBadge(organization.qualityLevel)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Basic Info */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Building className="w-4 h-4" /> Organization Details
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Type" value={organization.organizationType} />
              <DetailRow label="Industry" value={organization.industryClassification} />
              <DetailRow label="Size" value={organization.companySize} />
              <DetailRow label="Public Company" value={organization.isPublicCompany ? 'Yes' : 'No'} />
              {organization.stockSymbol && <DetailRow label="Stock Symbol" value={organization.stockSymbol} />}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Headquarters
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Address" value={organization.headquarters.line1} />
              <DetailRow label="City" value={organization.headquarters.city} />
              {organization.headquarters.stateProvince && <DetailRow label="State/Province" value={organization.headquarters.stateProvince} />}
              <DetailRow label="Country" value={organization.headquarters.countryName} />
              {organization.headquarters.postalCode && <DetailRow label="Postal Code" value={organization.headquarters.postalCode} />}
            </div>
          </CardContent>
        </Card>

        {/* Identifiers */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4" /> Regulatory Identifiers
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organization.dunsNumber && <DetailRow label="DUNS Number" value={organization.dunsNumber} />}
              {organization.fdaEstablishmentId && <DetailRow label="FDA Establishment ID" value={organization.fdaEstablishmentId} />}
              {organization.eudraVigilanceId && <DetailRow label="EudraVigilance ID" value={organization.eudraVigilanceId} />}
              {organization.leiNumber && <DetailRow label="LEI Number" value={organization.leiNumber} />}
              {!organization.dunsNumber && !organization.fdaEstablishmentId && <span className="text-text-muted text-sm">No identifiers on file</span>}
            </div>
          </CardContent>
        </Card>

        {/* Therapeutic Areas */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Beaker className="w-4 h-4" /> Therapeutic Areas
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {organization.therapeuticAreas.length > 0 ? (
                organization.therapeuticAreas.map(ta => (
                  <span key={ta} className="px-2 py-1 bg-accent-purple/20 text-accent-purple rounded text-sm">{ta}</span>
                ))
              ) : (
                <span className="text-text-muted text-sm">No therapeutic areas specified</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relationships */}
      {organization.relationships.length > 0 && (
        <Card variant="elevated" padding="lg" className="mt-6">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Relationships
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {organization.relationships.map(rel => (
                <div key={rel.id} className="flex items-center justify-between p-2 bg-surface rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary">{rel.relatedOrganizationName}</span>
                    <span className="text-text-muted text-xs">({rel.relationshipType})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${rel.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                    {rel.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Info */}
      <Card variant="elevated" padding="lg" className="mt-6">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Created: {new Date(organization.createdAt).toLocaleDateString()} by {organization.createdBy}</span>
          <span>Last Modified: {new Date(organization.updatedAt).toLocaleDateString()} by {organization.lastModifiedBy}</span>
        </div>
      </Card>
    </div>
  );
}

function ContactDetail({ contact, getQualityBadge, getStatusBadge }: { 
  contact: Contact;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-teal/20 rounded-xl">
            <Users className="w-6 h-6 text-accent-teal" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{contact.displayName}</h2>
            <p className="text-sm text-text-muted">{contact.contactId} • {contact.jobTitle || 'No title'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(contact.status)}
          {getQualityBadge(contact.qualityLevel)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4" /> Contact Information
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Full Name" value={`${contact.firstName} ${contact.middleName || ''} ${contact.lastName}`} />
              <DetailRow label="Title" value={contact.title || 'Not specified'} />
              <DetailRow label="Department" value={contact.department || 'Not specified'} />
              <DetailRow label="Organization" value={contact.organizationName || 'Not specified'} />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4" /> Communication
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contact.primaryEmail && <DetailRow label="Email" value={contact.primaryEmail} />}
              {contact.workPhone && <DetailRow label="Work Phone" value={contact.workPhone} />}
              {contact.mobilePhone && <DetailRow label="Mobile" value={contact.mobilePhone} />}
              <DetailRow label="Preferred Method" value={contact.preferredContactMethod} />
              <DetailRow label="Timezone" value={contact.timezone} />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Award className="w-4 h-4" /> Expertise & Languages
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contact.expertiseAreas.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted">Expertise Areas</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.expertiseAreas.map(area => (
                      <span key={area} className="px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded text-xs">{area}</span>
                    ))}
                  </div>
                </div>
              )}
              {contact.languages.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted">Languages</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.languages.map(lang => (
                      <span key={lang} className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded text-xs">{lang}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4" /> Roles
            </h3>
          </CardHeader>
          <CardContent>
            {contact.roles.length > 0 ? (
              <div className="space-y-2">
                {contact.roles.map(role => (
                  <div key={role.id} className="p-2 bg-surface rounded flex items-center justify-between">
                    <div>
                      <span className="text-text-primary text-sm">{role.roleType}</span>
                      {role.isPrimary && <span className="ml-2 text-xs text-accent-amber">(Primary)</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${role.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {role.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-text-muted text-sm">No roles assigned</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated" padding="lg" className="mt-6">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Created: {new Date(contact.createdAt).toLocaleDateString()} by {contact.createdBy}</span>
          <span>Last Modified: {new Date(contact.updatedAt).toLocaleDateString()} by {contact.lastModifiedBy}</span>
        </div>
      </Card>
    </div>
  );
}

function SiteDetail({ site, getQualityBadge, getStatusBadge }: { 
  site: Site;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-green/20 rounded-xl">
            <MapPin className="w-6 h-6 text-accent-green" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{site.name}</h2>
            <p className="text-sm text-text-muted">{site.siteId} • {site.siteType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(site.status)}
          {getQualityBadge(site.qualityLevel)}
          <span className={`px-2 py-0.5 rounded text-xs ${
            site.qualificationStatus === 'qualified' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {site.qualificationStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Building className="w-4 h-4" /> Site Information
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Type" value={site.siteType} />
              <DetailRow label="Category" value={site.siteCategory} />
              <DetailRow label="Organization" value={site.organizationName || 'Not specified'} />
              <DetailRow label="Timezone" value={site.timezone} />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Address" value={site.address.line1} />
              <DetailRow label="City" value={site.address.city} />
              {site.address.stateProvince && <DetailRow label="State/Province" value={site.address.stateProvince} />}
              <DetailRow label="Country" value={site.address.countryName} />
              {site.address.postalCode && <DetailRow label="Postal Code" value={site.address.postalCode} />}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Award className="w-4 h-4" /> Capabilities
            </h3>
          </CardHeader>
          <CardContent>
            {site.capabilities && site.capabilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {site.capabilities.map(cap => (
                  <span key={cap.id} className="px-2 py-1 bg-accent-blue/20 text-accent-blue rounded text-sm">{cap.capabilityName}</span>
                ))}
              </div>
            ) : (
              <span className="text-text-muted text-sm">No capabilities listed</span>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Qualification
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Status" value={site.qualificationStatus} />
              {site.qualificationDate && <DetailRow label="Qualified Date" value={new Date(site.qualificationDate).toLocaleDateString()} />}
              <DetailRow label="Address Verified" value={site.address.isVerified ? 'Yes' : 'No'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated" padding="lg" className="mt-6">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Created: {new Date(site.createdAt).toLocaleDateString()} by {site.createdBy}</span>
          <span>Last Modified: {new Date(site.updatedAt).toLocaleDateString()} by {site.lastModifiedBy}</span>
        </div>
      </Card>
    </div>
  );
}

function ProductDetail({ product, getQualityBadge, getStatusBadge }: { 
  product: Product;
  getQualityBadge: (level: DataQualityLevel) => React.ReactNode;
  getStatusBadge: (status: EntityStatus) => React.ReactNode;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent-purple/20 rounded-xl">
            <Package className="w-6 h-6 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{product.productName}</h2>
            <p className="text-sm text-text-muted">{product.productId} • {product.genericName || 'No generic name'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(product.status)}
          {getQualityBadge(product.qualityLevel)}
          <span className="px-2 py-0.5 rounded text-xs bg-accent-teal/20 text-accent-teal">
            {product.developmentPhase}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Package className="w-4 h-4" /> Product Details
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DetailRow label="Type" value={product.productType} />
              <DetailRow label="Category" value={product.productCategory} />
              <DetailRow label="Development Phase" value={product.developmentPhase} />
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Beaker className="w-4 h-4" /> Classification
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.therapeuticClass && product.therapeuticClass.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted">Therapeutic Class</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.therapeuticClass.map(tc => (
                      <span key={tc} className="px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded text-xs">{tc}</span>
                    ))}
                  </div>
                </div>
              )}
              {product.pharmacologicClass && product.pharmacologicClass.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted">Pharmacologic Class</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.pharmacologicClass.map(pc => (
                      <span key={pc} className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded text-xs">{pc}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4" /> Administration
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {product.routeOfAdministration && product.routeOfAdministration.length > 0 && (
                <div>
                  <span className="text-xs text-text-muted">Route of Administration</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.routeOfAdministration.map(route => (
                      <span key={route} className="px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded text-xs">{route}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" padding="lg">
          <CardHeader>
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Globe className="w-4 h-4" /> Regulatory Status
            </h3>
          </CardHeader>
          <CardContent>
            {product.regulatoryStatus && product.regulatoryStatus.length > 0 ? (
              <div className="space-y-2">
                {product.regulatoryStatus.map(status => (
                  <div key={`${status.region}-${status.authority}`} className="p-2 bg-surface rounded flex items-center justify-between">
                    <span className="text-text-primary text-sm">{status.region} - {status.authority}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      status.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      status.status === 'under-review' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-text-muted text-sm">No regulatory status on file</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated" padding="lg" className="mt-6">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Created: {new Date(product.createdAt).toLocaleDateString()} by {product.createdBy}</span>
          <span>Last Modified: {new Date(product.updatedAt).toLocaleDateString()} by {product.lastModifiedBy}</span>
        </div>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}

function EmptyState({ activeTab }: { activeTab: MDMTab }) {
  const content: Record<MDMTab, { icon: React.ReactNode; title: string; description: string }> = {
    organizations: {
      icon: <Building2 className="w-12 h-12 text-text-muted" />,
      title: 'Select an Organization',
      description: 'Choose an organization from the list to view its details, relationships, and regulatory identifiers.'
    },
    contacts: {
      icon: <Users className="w-12 h-12 text-text-muted" />,
      title: 'Select a Contact',
      description: 'Choose a contact from the list to view their profile, roles, and communication preferences.'
    },
    sites: {
      icon: <MapPin className="w-12 h-12 text-text-muted" />,
      title: 'Select a Site',
      description: 'Choose a site from the list to view its location, capabilities, and qualification status.'
    },
    products: {
      icon: <Package className="w-12 h-12 text-text-muted" />,
      title: 'Select a Product',
      description: 'Choose a product from the list to view its classification, indications, and regulatory status.'
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        {content[activeTab].icon}
        <h3 className="text-lg font-medium text-text-primary mt-4">{content[activeTab].title}</h3>
        <p className="text-sm text-text-muted mt-2 max-w-sm">{content[activeTab].description}</p>
      </div>
    </div>
  );
}
