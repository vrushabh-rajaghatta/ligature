

import { useState, useEffect } from 'react';
import {
  Globe, CheckCircle, AlertTriangle, XCircle, RefreshCw,
  Clock, ExternalLink, Wifi, WifiOff, Activity
} from 'lucide-react';
import { useSequenceBuilderStore, GatewayStatus } from '@/store/useSequenceBuilderStore';
import { regionalConfigs, Region } from '@/config/regional-config';

interface GatewayMonitorProps {
  compact?: boolean;
  onSelectGateway?: (gateway: string) => void;
}

const gatewayDetails: Record<string, { name: string; region: Region; description: string }> = {
  'fda-esg': { 
    name: 'FDA ESG', 
    region: 'fda',
    description: 'Electronic Submissions Gateway' 
  },
  'ema-cesp': { 
    name: 'EMA CESP', 
    region: 'ema',
    description: 'Common European Submission Platform' 
  },
  'pmda-gateway': { 
    name: 'PMDA Gateway', 
    region: 'pmda',
    description: 'Japan PMDA Electronic Gateway' 
  },
  'hc-cta': { 
    name: 'Health Canada', 
    region: 'hc',
    description: 'Common Electronic Submissions Gateway' 
  },
};

export function GatewayMonitor({ compact = false, onSelectGateway }: GatewayMonitorProps) {
  const gatewayStatuses = useSequenceBuilderStore(s => s.gatewayStatuses);
  const checkGatewayStatus = useSequenceBuilderStore(s => s.checkGatewayStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  
  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        checkGatewayStatus('fda-esg'),
        checkGatewayStatus('ema-cesp'),
        checkGatewayStatus('pmda-gateway'),
        checkGatewayStatus('hc-cta'),
      ]);
      setLastRefreshed(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const getStatusIcon = (status: GatewayStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'maintenance':
        return <Clock className="w-4 h-4 text-accent-blue" />;
    }
  };
  
  const getStatusColor = (status: GatewayStatus['status']) => {
    switch (status) {
      case 'online': return 'bg-accent-green/20 text-accent-green border-accent-green/30';
      case 'degraded': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'offline': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'maintenance': return 'bg-accent-blue/20 text-accent-blue border-accent-blue/30';
    }
  };
  
  const getStatusLabel = (status: GatewayStatus['status']) => {
    switch (status) {
      case 'online': return 'Online';
      case 'degraded': return 'Degraded';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
    }
  };
  
  // Calculate overall health
  const onlineCount = gatewayStatuses.filter(g => g.status === 'online').length;
  const totalCount = gatewayStatuses.length || 4;
  const healthPercent = Math.round((onlineCount / totalCount) * 100);
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {healthPercent === 100 ? (
            <Wifi className="w-4 h-4 text-accent-green" />
          ) : healthPercent > 50 ? (
            <Activity className="w-4 h-4 text-amber-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-xs text-text-muted">
            {onlineCount}/{totalCount} Gateways
          </span>
        </div>
        {gatewayStatuses.some(g => g.status !== 'online') && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Issues
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-accent-blue" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Gateway Status</h3>
            <p className="text-xs text-text-muted">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Overall Health */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">Overall Health</span>
          <span className={`text-xs font-medium ${
            healthPercent === 100 ? 'text-accent-green' :
            healthPercent > 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {healthPercent}%
          </span>
        </div>
        <div className="h-2 bg-surface-card rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              healthPercent === 100 ? 'bg-accent-green' :
              healthPercent > 50 ? 'bg-amber-400' : 'bg-red-400'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
      
      {/* Gateway List */}
      <div className="divide-y divide-border">
        {Object.entries(gatewayDetails).map(([gatewayId, details]) => {
          const status = gatewayStatuses.find(g => g.gateway === gatewayId);
          const config = regionalConfigs[details.region];
          
          return (
            <div 
              key={gatewayId}
              className={`p-4 hover:bg-surface transition-colors ${onSelectGateway ? 'cursor-pointer' : ''}`}
              onClick={() => onSelectGateway?.(gatewayId)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    status?.status === 'online' ? 'bg-accent-green/10' :
                    status?.status === 'degraded' ? 'bg-amber-500/10' :
                    status?.status === 'offline' ? 'bg-red-500/10' :
                    'bg-surface-card'
                  }`}>
                    {getStatusIcon(status?.status || 'offline')}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{details.name}</div>
                    <div className="text-xs text-text-muted">{details.description}</div>
                    <div className="text-xs text-text-muted mt-1">
                      eCTD v{config.ectdVersion}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(status?.status || 'offline')}`}>
                    {getStatusLabel(status?.status || 'offline')}
                  </span>
                  {status?.message && (
                    <span className="text-xs text-text-muted max-w-[150px] text-right">
                      {status.message}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Gateway URL */}
              <div className="mt-2 flex items-center gap-2">
                <a 
                  href={config.gateway.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  {config.gateway.url}
                </a>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="p-3 bg-surface border-t border-border">
        <p className="text-xs text-text-muted text-center">
          Status refreshes automatically every 5 minutes
        </p>
      </div>
    </div>
  );
}

// Compact inline status for header
export function GatewayStatusBadge() {
  const gatewayStatuses = useSequenceBuilderStore(s => s.gatewayStatuses);
  
  const onlineCount = gatewayStatuses.filter(g => g.status === 'online').length;
  const hasIssues = gatewayStatuses.some(g => g.status !== 'online');
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
      !hasIssues ? 'bg-accent-green/10 text-accent-green' :
      onlineCount > 2 ? 'bg-amber-500/10 text-amber-400' :
      'bg-red-500/10 text-red-400'
    }`}>
      {!hasIssues ? (
        <Wifi className="w-3 h-3" />
      ) : (
        <Activity className="w-3 h-3" />
      )}
      {onlineCount}/4 Online
    </div>
  );
}
