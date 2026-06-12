
// ============================================================================
// RegistrationsTracker - v0.33.0
// Global registration matrix and status tracking
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  Globe, CheckCircle2, Clock, AlertCircle, XCircle,
  Calendar, FileText, Building2, ChevronDown, ChevronRight,
  Search, Filter, Download, RefreshCw, Plus, Edit2, Eye,
  MapPin, Award, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Registration } from '@/types/core';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  registrations,
  productNames,
  productColors,
  getRegistrationsByProduct,
} from '@/data/regulatory-data';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'matrix' | 'list' | 'timeline';
type FilterStatus = 'all' | 'Active' | 'Pending' | 'Expired' | 'Withdrawn';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  Active: { 
    icon: CheckCircle2, 
    color: 'text-green-400', 
    bg: 'bg-green-500/20',
    label: 'Active'
  },
  Pending: { 
    icon: Clock, 
    color: 'text-amber-400', 
    bg: 'bg-amber-500/20',
    label: 'Pending'
  },
  Expired: { 
    icon: AlertCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20',
    label: 'Expired'
  },
  Withdrawn: { 
    icon: XCircle, 
    color: 'text-slate-400', 
    bg: 'bg-slate-500/20',
    label: 'Withdrawn'
  },
};

const COUNTRIES = [
  'United States',
  'European Union',
  'United Kingdom',
  'Japan',
  'China',
  'Canada',
  'Australia',
  'Brazil',
  'South Korea',
  'Switzerland',
];

const PRODUCTS = Object.keys(productNames);

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: Registration['status'] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function MatrixCell({ 
  registration, 
  onClick 
}: { 
  registration: Registration | null;
  onClick?: () => void;
}) {
  if (!registration) {
    return (
      <td className="p-2 text-center border-r border-border">
        <span className="text-text-muted text-xs">—</span>
      </td>
    );
  }
  
  const config = STATUS_CONFIG[registration.status];
  const Icon = config.icon;
  
  return (
    <td 
      className="p-2 text-center border-r border-border cursor-pointer hover:bg-surface-card transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-1">
        <div className={`p-1.5 rounded-full ${config?.bg ?? ''}`}>
          <Icon className={`w-4 h-4 ${config?.color ?? ''}`} />
        </div>
        {registration.licenseNumber && (
          <span className="text-[10px] text-text-muted truncate max-w-[80px]">
            {registration.licenseNumber}
          </span>
        )}
      </div>
    </td>
  );
}

function RegistrationCard({ 
  registration,
  productName,
  onView,
}: { 
  registration: Registration;
  productName: string;
  onView?: () => void;
}) {
  const config = STATUS_CONFIG[registration.status];
  const Icon = config.icon;
  
  const daysUntilRenewal = registration.renewalDueDate 
    ? Math.ceil((new Date(registration.renewalDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 hover:border-accent-blue/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-text-primary">{productName}</h3>
          <p className="text-sm text-text-muted flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {registration.country}
          </p>
        </div>
        <StatusBadge status={registration.status} />
      </div>
      
      <div className="space-y-2 text-sm">
        {registration.licenseNumber && (
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-text-muted" />
            <span className="text-text-secondary">{registration.licenseNumber}</span>
          </div>
        )}
        
        {registration.approvalDate && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span className="text-text-secondary">
              Approved: {new Date(registration.approvalDate).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {registration.expiryDate && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-text-muted" />
            <span className="text-text-secondary">
              Expires: {new Date(registration.expiryDate).toLocaleDateString()}
            </span>
          </div>
        )}
        
        {daysUntilRenewal !== null && daysUntilRenewal <= 180 && (
          <div className={`flex items-center gap-2 ${daysUntilRenewal <= 90 ? 'text-amber-400' : 'text-text-muted'}`}>
            <RefreshCw className="w-4 h-4" />
            <span>Renewal in {daysUntilRenewal} days</span>
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-border flex justify-end">
        <button 
          onClick={onView}
          className="text-xs text-accent-blue hover:underline flex items-center gap-1"
        >
          View Details
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function SummaryStats() {
    const { deadClick } = useDeadClick();
  const stats = useMemo(() => {
    const active = registrations.filter(r => r.status === 'Active').length;
    const pending = registrations.filter(r => r.status === 'Pending').length;
    const expired = registrations.filter(r => r.status === 'Expired').length;
    
    // Count renewals due in 6 months
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const renewalsDue = registrations.filter(r => 
      r.renewalDueDate && new Date(r.renewalDueDate) <= sixMonthsFromNow
    ).length;
    
    return { active, pending, expired, renewalsDue, total: registrations.length };
  }, []);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 md:mb-6">
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted">Total</span>
        </div>
        <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-text-muted">Active</span>
        </div>
        <p className="text-2xl font-semibold text-green-400">{stats.active}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-text-muted">Pending</span>
        </div>
        <p className="text-2xl font-semibold text-amber-400">{stats.pending}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-text-muted">Expired</span>
        </div>
        <p className="text-2xl font-semibold text-red-400">{stats.expired}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-text-muted">Renewals Due (6mo)</span>
        </div>
        <p className="text-2xl font-semibold text-blue-400">{stats.renewalsDue}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RegistrationsTracker() {
  const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  
  // Build matrix data
  const matrixData = useMemo(() => {
    return PRODUCTS.map(productId => {
      const productRegs = getRegistrationsByProduct(productId);
      const countryMap: Record<string, Registration | null> = {};
      
      COUNTRIES.forEach(country => {
        countryMap[country] = productRegs.find(r => r.country === country) || null;
      });
      
      return { 
        productId, 
        productName: productNames[productId], 
        countries: countryMap 
      };
    });
  }, []);
  
  // Filtered registrations for list view
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      if (statusFilter !== 'all' && reg.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const productName = productNames[reg.productId]?.toLowerCase() || '';
        if (!productName.includes(query) && 
            !reg.country.toLowerCase().includes(query) &&
            !reg.licenseNumber?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [statusFilter, searchQuery]);
  
  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        title="Registrations Tracker"
        subtitle="Global registration status matrix — track approvals across health authorities and markets"
        icon={<Globe className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center gap-2" onClick={() => toast.success('Registration action queued — country team notified')}>
              <Download className="w-4 h-4" />Export
            </button>
            <CapabilityGate moduleId="regulatory" capability="author" inline>
              <button className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2" onClick={() => toast.success('Registration action queued — country team notified')}>
                <Plus className="w-4 h-4" />Add Registration
              </button>
            </CapabilityGate>
          </div>
        }
      />

      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <SummaryStats />
        
        {viewMode === 'matrix' ? (
          /* Matrix View */
          <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="p-3 text-left font-medium text-text-primary border-r border-border sticky left-0 bg-surface z-10">
                      Product
                    </th>
                    {COUNTRIES.map(country => (
                      <th key={country} className="p-3 text-center font-medium text-text-primary border-r border-border min-w-[100px]">
                        <span className="text-xs">{country}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((row, idx) => (
                    <tr key={row.productId} className={idx % 2 === 0 ? 'bg-surface-card' : 'bg-surface'}>
                      <td className="p-3 font-medium text-text-primary border-r border-border sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${productColors[row.productId]}-400`} />
                          <span className="text-sm">{row.productName}</span>
                        </div>
                      </td>
                      {COUNTRIES.map(country => (
                        <MatrixCell 
                          key={country}
                          registration={row.countries[country]}
                          onClick={() => row.countries[country] && setSelectedRegistration(row.countries[country])}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Legend */}
            <div className="p-3 border-t border-border bg-surface flex items-center gap-6">
              <span className="text-xs text-text-muted">Legend:</span>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const Icon = config.icon;
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`p-1 rounded-full ${config?.bg ?? ''}`}>
                      <Icon className={`w-3 h-3 ${config?.color ?? ''}`} />
                    </div>
                    <span className="text-xs text-text-muted">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegistrations.map(reg => (
              <RegistrationCard
                key={reg.id}
                registration={reg}
                productName={productNames[reg.productId]}
                onView={() => setSelectedRegistration(reg)}
              />
            ))}
            
            {filteredRegistrations.length === 0 && (
              <div className="col-span-full text-center py-12 text-text-muted">
                No registrations match your filters
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Details Drawer */}
      {selectedRegistration && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedRegistration(null)}>
          <div 
            className="w-full max-w-md bg-surface-elevated h-full overflow-auto border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Registration Details</h2>
                <button 
                  onClick={() => setSelectedRegistration(null)}
                  className="p-1 hover:bg-surface-card rounded"
                >
                  <XCircle className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${productColors[selectedRegistration.productId]}-500/20 rounded-lg`}>
                  <Building2 className={`w-5 h-5 text-${productColors[selectedRegistration.productId]}-400`} />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary">
                    {productNames[selectedRegistration.productId]}
                  </h3>
                  <p className="text-sm text-text-muted">{selectedRegistration.country}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedRegistration.status} />
                </div>
              </div>
              
              {selectedRegistration.licenseNumber && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">License Number</label>
                  <p className="mt-1 text-text-primary font-mono">{selectedRegistration.licenseNumber}</p>
                </div>
              )}
              
              {selectedRegistration.approvalDate && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Approval Date</label>
                  <p className="mt-1 text-text-primary">
                    {new Date(selectedRegistration.approvalDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {selectedRegistration.expiryDate && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Expiry Date</label>
                  <p className="mt-1 text-text-primary">
                    {new Date(selectedRegistration.expiryDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {selectedRegistration.renewalDueDate && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Renewal Due</label>
                  <p className="mt-1 text-text-primary">
                    {new Date(selectedRegistration.renewalDueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              <div className="pt-4 border-t border-border space-y-2">
                <button className="w-full px-4 py-2 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center justify-center gap-2" onClick={() => toast.success('Registration action queued — country team notified')}>
                  <Edit2 className="w-4 h-4" />
                  Edit Registration
                </button>
                <button className="w-full px-4 py-2 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center justify-center gap-2" onClick={() => toast.success('Registration action queued — country team notified')}>
                  <FileText className="w-4 h-4" />
                  View Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegistrationsTracker;
