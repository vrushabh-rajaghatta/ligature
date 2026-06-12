
/**
 * SessionManagementPanel Component
 * Part 11 compliant session management
 * Version: 0.9.7
 */


import React, { useState, useCallback, useMemo } from 'react';
import { 
  Monitor, Smartphone, Globe, Clock, MapPin, AlertTriangle, 
  X, RefreshCw, Shield, Check, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { SESSION_CONFIG } from '@/services/auth/AuthService';
import type { Session } from '@/services/auth/AuthService';

interface SessionManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Demo sessions data
const DEMO_SESSIONS: Session[] = [
  {
    id: 'session-current',
    userId: 'user-001',
    token: 'current-session-token',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastActiveAt: new Date(),
  },
  {
    id: 'session-mobile',
    userId: 'user-001',
    token: 'mobile-session-token',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
    ipAddress: '10.0.0.45',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    lastActiveAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
  },
  {
    id: 'session-old',
    userId: 'user-001',
    token: 'old-session-token',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
    ipAddress: '172.16.0.50',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
];

function parseUserAgent(ua?: string): { device: string; browser: string; os: string } {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  
  let device = 'Desktop';
  let browser = 'Unknown';
  let os = 'Unknown';
  
  // Device detection
  if (ua.includes('iPhone') || ua.includes('iPad')) device = 'iPhone';
  else if (ua.includes('Android')) device = 'Android';
  else if (ua.includes('Mobile')) device = 'Mobile';
  
  // Browser detection
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  // OS detection
  if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  
  return { device, browser, os };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatExpiresIn(date: Date): string {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export function SessionManagementPanel({ isOpen, onClose }: SessionManagementPanelProps) {
  const [sessions, setSessions] = useState<Session[]>(DEMO_SESSIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  
  const currentSession = useAuthStore((s) => s.session);
  
  const currentSessionId = currentSession?.id || 'session-current';
  
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 500));
    setIsLoading(false);
  }, []);
  
  const handleRevokeSession = useCallback(async (sessionId: string) => {
    if (sessionId === currentSessionId) {
      // Can't revoke current session from here
      return;
    }
    
    setRevoking(sessionId);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setRevoking(null);
  }, [currentSessionId]);
  
  const handleRevokeAllOther = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    setSessions((prev) => prev.filter((s) => s.id === currentSessionId));
    setIsLoading(false);
  }, [currentSessionId]);
  
  const otherSessions = useMemo(() => 
    sessions.filter((s) => s.id !== currentSessionId),
    [sessions, currentSessionId]
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Active Sessions</h2>
              <p className="text-sm text-gray-500">
                {sessions.length} active · Max {SESSION_CONFIG.maxConcurrentSessions} allowed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Session */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Current Session
            </h3>
            {sessions.filter((s) => s.id === currentSessionId).map((session) => {
              const { device, browser, os } = parseUserAgent(session.userAgent);
              return (
                <div 
                  key={session.id}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      {device === 'iPhone' || device === 'Android' || device === 'Mobile' ? (
                        <Smartphone className="w-6 h-6 text-green-600" />
                      ) : (
                        <Monitor className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{browser} on {os}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          <Check className="w-3 h-3 mr-1" />
                          Current
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-4 h-4" />
                          {session.ipAddress}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Active {formatTimeAgo(session.lastActiveAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Started {formatTimeAgo(session.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Session expires in {formatExpiresIn(session.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Other Sessions */}
          {otherSessions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Other Sessions ({otherSessions.length})
                </h3>
                <button
                  onClick={handleRevokeAllOther}
                  disabled={isLoading}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Revoke All Other
                </button>
              </div>
              <div className="space-y-3">
                {otherSessions.map((session) => {
                  const { device, browser, os } = parseUserAgent(session.userAgent);
                  const isRevoking = revoking === session.id;
                  
                  return (
                    <div 
                      key={session.id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          {device === 'iPhone' || device === 'Android' || device === 'Mobile' ? (
                            <Smartphone className="w-6 h-6 text-gray-600" />
                          ) : (
                            <Monitor className="w-6 h-6 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium text-gray-900">{browser} on {os}</span>
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              disabled={isRevoking}
                              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                              {isRevoking ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Revoking...
                                </>
                              ) : (
                                'Revoke'
                              )}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Globe className="w-4 h-4" />
                              {session.ipAddress}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Active {formatTimeAgo(session.lastActiveAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              Started {formatTimeAgo(session.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Expires in {formatExpiresIn(session.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* No Other Sessions */}
          {otherSessions.length === 0 && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No other active sessions</p>
              <p className="text-sm text-gray-400 mt-1">
                You&apos;re only signed in on this device
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex-shrink-0">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700">Session Security</p>
              <p className="mt-1">
                Sessions expire after {SESSION_CONFIG.inactivityTimeoutMinutes} minutes of inactivity.
                Maximum session duration is {SESSION_CONFIG.maxDurationMinutes / 60} hours.
                All session activity is logged for Part 11 compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionManagementPanel;
