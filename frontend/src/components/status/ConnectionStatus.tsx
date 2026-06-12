/**
 * ConnectionStatus
 * WebSocket connection health indicator
 * 
 * v0.42.1 - Connection Status UI
 */


import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
  Server,
} from 'lucide-react';
import { ConnectionState, getWebSocketPool } from '@/services/websocket-connection-pool';

// =============================================================================
// TYPES
// =============================================================================

export interface ConnectionInfo {
  id: string;
  state: ConnectionState;
  url: string;
  channelCount: number;
  lastPing: number;
  lastPong: number;
  queuedMessages: number;
  reconnectAttempts: number;
}

export interface ConnectionStatusProps {
  showDetails?: boolean;
  position?: 'inline' | 'fixed-bottom' | 'fixed-top';
  onReconnect?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStateConfig(state: ConnectionState) {
  switch (state) {
    case 'connected':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Connected',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        pulse: false,
      };
    case 'connecting':
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        label: 'Connecting',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        pulse: true,
      };
    case 'reconnecting':
      return {
        icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        label: 'Reconnecting',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        pulse: true,
      };
    case 'error':
      return {
        icon: <XCircle className="w-4 h-4" />,
        label: 'Error',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        pulse: false,
      };
    case 'disconnected':
    default:
      return {
        icon: <WifiOff className="w-4 h-4" />,
        label: 'Disconnected',
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
        pulse: false,
      };
  }
}

function formatLatency(pingTime: number, pongTime: number): string {
  if (!pingTime || !pongTime) return '-';
  const latency = pongTime - pingTime;
  if (latency < 0) return '-';
  return `${latency}ms`;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConnectionStatus({
  showDetails = true,
  position = 'inline',
  onReconnect,
}: ConnectionStatusProps) {
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [overallState, setOverallState] = useState<ConnectionState>('disconnected');
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, connected: 0, channels: 0, queued: 0 });

  useEffect(() => {
    const pool = getWebSocketPool();
    
    const updateConnections = () => {
      const poolStats = pool.getStats();
      
      setStats({
        total: poolStats.totalConnections,
        connected: poolStats.connectedCount,
        channels: poolStats.totalChannels,
        queued: poolStats.queuedMessages,
      });

      // Determine overall state
      if (poolStats.totalConnections === 0) {
        setOverallState('disconnected');
      } else if (poolStats.connectedCount === poolStats.totalConnections) {
        setOverallState('connected');
      } else if (poolStats.connectedCount > 0) {
        setOverallState('reconnecting');
      } else {
        setOverallState('error');
      }
    };

    // Subscribe to state changes
    const unsubscribe = pool.onStateChange(() => {
      updateConnections();
    });

    // Initial update
    updateConnections();

    // Periodic refresh
    const interval = setInterval(updateConnections, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const config = getStateConfig(overallState);

  const positionClasses = {
    'inline': '',
    'fixed-bottom': 'fixed bottom-4 right-4 z-50',
    'fixed-top': 'fixed top-4 right-4 z-50',
  }[position];

  // Compact indicator
  if (!showDetails) {
    return (
      <div className={positionClasses}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config?.bg ?? ''} ${config?.border ?? ''} border`}>
          <span className={config.color}>{config.icon}</span>
          <span className={`text-sm ${config?.color ?? ''}`}>{config.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={positionClasses}>
      <div className={`rounded-xl ${config?.bg ?? ''} ${config?.border ?? ''} border shadow-lg overflow-hidden min-w-[280px]`}>
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`${config?.color ?? ''} ${config.pulse ? 'animate-pulse' : ''}`}>
              {config.icon}
            </div>
            <div className="text-left">
              <div className={`text-sm font-medium ${config?.color ?? ''}`}>{config.label}</div>
              <div className="text-xs text-gray-500">
                {stats.connected}/{stats.total} connections • {stats.channels} channels
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-white/5">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-px bg-white/5">
              <StatBox
                icon={<Server className="w-3 h-3" />}
                label="Connections"
                value={`${stats.connected}/${stats.total}`}
              />
              <StatBox
                icon={<Zap className="w-3 h-3" />}
                label="Channels"
                value={stats.channels.toString()}
              />
              <StatBox
                icon={<Clock className="w-3 h-3" />}
                label="Queued"
                value={stats.queued.toString()}
                highlight={stats.queued > 0}
              />
            </div>

            {/* Connection Health */}
            <div className="p-3 border-t border-white/5">
              <div className="text-xs text-gray-500 mb-2">Connection Health</div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map(i => {
                  const isActive = i < stats.connected;
                  const isPartial = i < stats.total && i >= stats.connected;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        isActive
                          ? 'bg-emerald-500'
                          : isPartial
                            ? 'bg-amber-500'
                            : 'bg-gray-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            {(overallState === 'error' || overallState === 'disconnected') && onReconnect && (
              <div className="p-3 border-t border-white/5">
                <button
                  onClick={onReconnect}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </button>
              </div>
            )}

            {/* Network Info */}
            <div className="px-3 py-2 border-t border-white/5 bg-black/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Network</span>
                <span className={navigator.onLine ? 'text-emerald-400' : 'text-red-400'}>
                  {navigator.onLine ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatBox({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 py-2 bg-[#1a1f28]">
      <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-0.5">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-medium ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

// =============================================================================
// MINI INDICATOR (for headers)
// =============================================================================

export function ConnectionMiniIndicator({
  onClick,
}: {
  onClick?: () => void;
}) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [stats, setStats] = useState({ connected: 0, total: 0 });

  useEffect(() => {
    const pool = getWebSocketPool();
    
    const update = () => {
      const poolStats = pool.getStats();
      setStats({
        connected: poolStats.connectedCount,
        total: poolStats.totalConnections,
      });
      
      if (poolStats.totalConnections === 0) {
        setState('disconnected');
      } else if (poolStats.connectedCount === poolStats.totalConnections) {
        setState('connected');
      } else if (poolStats.connectedCount > 0) {
        setState('reconnecting');
      } else {
        setState('error');
      }
    };

    const unsubscribe = pool.onStateChange(update);
    update();

    return unsubscribe;
  }, []);

  const config = getStateConfig(state);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors
                  ${config?.bg ?? ''} ${config?.border ?? ''} border hover:bg-white/5`}
      title={`${config?.label ?? ''} (${stats.connected}/${stats.total})`}
    >
      <span className={`${config?.color ?? ''} ${config.pulse ? 'animate-pulse' : ''}`}>
        {state === 'connected' ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : state === 'connecting' || state === 'reconnecting' ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
      </span>
      {stats.total > 0 && (
        <span className={`text-xs ${config?.color ?? ''}`}>
          {stats.connected}/{stats.total}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// PULSE DOT INDICATOR
// =============================================================================

export function ConnectionDot() {
  const [state, setState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    const pool = getWebSocketPool();
    
    const update = () => {
      const stats = pool.getStats();
      if (stats.totalConnections === 0) {
        setState('disconnected');
      } else if (stats.connectedCount === stats.totalConnections) {
        setState('connected');
      } else if (stats.connectedCount > 0) {
        setState('reconnecting');
      } else {
        setState('error');
      }
    };

    const unsubscribe = pool.onStateChange(update);
    update();

    return unsubscribe;
  }, []);

  const colorClass = {
    connected: 'bg-emerald-500',
    connecting: 'bg-blue-500 animate-pulse',
    reconnecting: 'bg-amber-500 animate-pulse',
    error: 'bg-red-500',
    disconnected: 'bg-gray-500',
  }[state];

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colorClass}`}
      title={getStateConfig(state).label}
    />
  );
}

// =============================================================================
// CONNECTION HEALTH BAR
// =============================================================================

export function ConnectionHealthBar({
  showLabel = true,
  size = 'md',
}: {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const pool = getWebSocketPool();
    let lastPing = 0;
    
    const update = () => {
      const stats = pool.getStats();
      if (stats.connectedCount === stats.totalConnections && stats.totalConnections > 0) {
        setState('connected');
      } else if (stats.totalConnections === 0) {
        setState('disconnected');
      } else {
        setState('reconnecting');
      }
    };

    const unsubscribe = pool.onStateChange(update);
    
    // Simulate latency measurement
    const interval = setInterval(() => {
      if (state === 'connected') {
        setLatency(Math.floor(Math.random() * 50) + 10); // Mock latency
      } else {
        setLatency(null);
      }
    }, 5000);

    update();

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [state]);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const colorClass = {
    connected: 'bg-emerald-500',
    connecting: 'bg-blue-500',
    reconnecting: 'bg-amber-500',
    error: 'bg-red-500',
    disconnected: 'bg-gray-500',
  }[state];

  const widthPercent = state === 'connected' ? 100 : state === 'reconnecting' ? 50 : 0;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-700 rounded-full overflow-hidden ${sizeClasses}`}>
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-400 min-w-[60px]">
          {state === 'connected' && latency ? `${latency}ms` : getStateConfig(state).label}
        </span>
      )}
    </div>
  );
}
