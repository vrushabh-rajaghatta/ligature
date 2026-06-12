

/**
 * TemporalFilter - v129
 * 
 * Date range selectors and temporal filtering components.
 * Features:
 * - Quick date presets (today, week, month, quarter, year)
 * - Custom date range picker
 * - "As of" point-in-time views
 * - Timeline scrubbing
 * - Regulatory snapshot dates
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  Calendar, Clock, ChevronDown, ChevronLeft, ChevronRight,
  History, Rewind, FastForward, Play, Pause,
  CalendarDays, CalendarRange, RotateCcw, Check,
  AlertCircle, Filter, X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type DatePreset = 
  | 'today' | 'yesterday' | 'this-week' | 'last-week'
  | 'this-month' | 'last-month' | 'this-quarter' | 'last-quarter'
  | 'this-year' | 'last-year' | 'last-7-days' | 'last-30-days'
  | 'last-90-days' | 'all-time' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface TemporalFilterProps {
  /** Current date range */
  value: DateRange;
  /** On date range change */
  onChange: (range: DateRange) => void;
  /** Show preset buttons */
  showPresets?: boolean;
  /** Available presets */
  presets?: DatePreset[];
  /** Show "as of" date selector */
  showAsOf?: boolean;
  /** Current "as of" date */
  asOfDate?: Date | null;
  /** On "as of" date change */
  onAsOfChange?: (date: Date | null) => void;
  /** Label */
  label?: string;
  /** Compact mode */
  compact?: boolean;
  /** Min date */
  minDate?: Date;
  /** Max date */
  maxDate?: Date;
  /** Show quick clear */
  showClear?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class */
  className?: string;
}

export interface TimelineScrubberProps {
  /** Start date of the timeline */
  startDate: Date;
  /** End date of the timeline */
  endDate: Date;
  /** Current position */
  currentDate: Date;
  /** On date change */
  onChange: (date: Date) => void;
  /** Key dates to mark on timeline */
  markers?: Array<{
    date: Date;
    label: string;
    type?: 'submission' | 'approval' | 'milestone' | 'event';
  }>;
  /** Show playback controls */
  showPlayback?: boolean;
  /** Playback speed (days per second) */
  playbackSpeed?: number;
  /** On playback state change */
  onPlaybackChange?: (playing: boolean) => void;
  /** Compact mode */
  compact?: boolean;
}

export interface AsOfSelectorProps {
  /** Current "as of" date */
  value: Date | null;
  /** On date change */
  onChange: (date: Date | null) => void;
  /** Available snapshot dates */
  snapshotDates?: Array<{
    date: Date;
    label: string;
    description?: string;
  }>;
  /** Label */
  label?: string;
  /** Show reset to current */
  showReset?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const presetConfig: Record<DatePreset, {
  label: string;
  getRange: () => DateRange;
}> = {
  'today': {
    label: 'Today',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'yesterday': {
    label: 'Yesterday',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'this-week': {
    label: 'This Week',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-week': {
    label: 'Last Week',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'this-month': {
    label: 'This Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-month': {
    label: 'Last Month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'this-quarter': {
    label: 'This Quarter',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-quarter': {
    label: 'Last Quarter',
    getRange: () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) - 1;
      const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const q = quarter < 0 ? 3 : quarter;
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, q * 3 + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'this-year': {
    label: 'This Year',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-year': {
    label: 'Last Year',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-7-days': {
    label: 'Last 7 Days',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-30-days': {
    label: 'Last 30 Days',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'last-90-days': {
    label: 'Last 90 Days',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end };
    },
  },
  'all-time': {
    label: 'All Time',
    getRange: () => ({ from: null, to: null }),
  },
  'custom': {
    label: 'Custom',
    getRange: () => ({ from: null, to: null }),
  },
};

const DEFAULT_PRESETS: DatePreset[] = [
  'today', 'last-7-days', 'last-30-days', 'this-month', 'this-quarter', 'all-time'
];

const markerTypeColors: Record<string, string> = {
  submission: 'bg-accent-blue',
  approval: 'bg-accent-green',
  milestone: 'bg-accent-purple',
  event: 'bg-accent-amber',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateShort(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateInput(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
}

function getPresetForRange(range: DateRange, presets: DatePreset[]): DatePreset | null {
  for (const preset of presets) {
    if (preset === 'custom') continue;
    const presetRange = presetConfig[preset]?.getRange();
    if (
      presetRange.from?.getTime() === range.from?.getTime() &&
      presetRange.to?.getTime() === range.to?.getTime()
    ) {
      return preset;
    }
  }
  if (range.from || range.to) return 'custom';
  return 'all-time';
}

// ============================================================================
// TEMPORAL FILTER COMPONENT
// ============================================================================

export function TemporalFilter({
  value,
  onChange,
  showPresets = true,
  presets = DEFAULT_PRESETS,
  showAsOf = false,
  asOfDate,
  onAsOfChange,
  label = 'Date Range',
  compact = false,
  minDate,
  maxDate,
  showClear = true,
  disabled = false,
  className = '',
}: TemporalFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>(formatDateInput(value.from));
  const [customTo, setCustomTo] = useState<string>(formatDateInput(value.to));
  
  const activePreset = useMemo(() => getPresetForRange(value, presets), [value, presets]);
  
  const handlePresetClick = useCallback((preset: DatePreset) => {
    if (preset === 'custom') {
      setIsOpen(true);
      return;
    }
    const range = presetConfig[preset]?.getRange();
    onChange(range);
    setIsOpen(false);
  }, [onChange]);
  
  const handleCustomApply = useCallback(() => {
    const from = parseDateInput(customFrom);
    const to = parseDateInput(customTo);
    onChange({ from, to });
    setIsOpen(false);
  }, [customFrom, customTo, onChange]);
  
  const handleClear = useCallback(() => {
    onChange({ from: null, to: null });
    setCustomFrom('');
    setCustomTo('');
  }, [onChange]);
  
  const displayText = useMemo(() => {
    if (!value.from && !value.to) return 'All Time';
    if (activePreset && activePreset !== 'custom') {
      return presetConfig[activePreset]?.label;
    }
    if (value.from && value.to) {
      return `${formatDateShort(value.from)} - ${formatDateShort(value.to)}`;
    }
    if (value.from) return `From ${formatDateShort(value.from)}`;
    if (value.to) return `Until ${formatDateShort(value.to)}`;
    return 'Select dates';
  }, [value, activePreset]);
  
  return (
    <div className={`relative ${className}`}>
      {!compact && label && (
        <label className="block text-xs font-medium text-text-muted mb-1.5">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        {/* Main button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border
            bg-surface-card border-border
            hover:border-accent-blue/30 transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isOpen ? 'border-accent-blue ring-1 ring-accent-blue/20' : ''}
            ${compact ? 'text-sm' : ''}
          `}
        >
          <Calendar className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-text-muted`} />
          <span className="text-text-primary">{displayText}</span>
          <ChevronDown className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-text-muted`} />
        </button>
        
        {/* Clear button */}
        {showClear && (value.from || value.to) && (
          <button
            onClick={handleClear}
            className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
            title="Clear filter"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        )}
        
        {/* As-of indicator */}
        {showAsOf && asOfDate && (
          <Badge color="purple" size="sm" icon={<History className="w-3 h-3" />}>
            As of {formatDateShort(asOfDate)}
          </Badge>
        )}
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-surface-elevated border border-border rounded-xl shadow-xl w-80">
          {/* Presets */}
          {showPresets && (
            <div className="p-3 border-b border-border">
              <div className="text-xs font-medium text-text-muted mb-2">Quick Select</div>
              <div className="flex flex-wrap gap-1.5">
                {presets.filter(p => p !== 'custom').map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className={`
                      px-2.5 py-1 rounded-full text-xs font-medium
                      transition-colors
                      ${activePreset === preset
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-secondary hover:bg-surface-card/80'
                      }
                    `}
                  >
                    {presetConfig[preset]?.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Custom range */}
          <div className="p-3">
            <div className="text-xs font-medium text-text-muted mb-2">Custom Range</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">From</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  min={minDate ? formatDateInput(minDate) : undefined}
                  max={customTo || (maxDate ? formatDateInput(maxDate) : undefined)}
                  className="w-full px-2 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">To</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  min={customFrom || (minDate ? formatDateInput(minDate) : undefined)}
                  max={maxDate ? formatDateInput(maxDate) : undefined}
                  className="w-full px-2 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCustomApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TIMELINE SCRUBBER COMPONENT
// ============================================================================

export function TimelineScrubber({
  startDate,
  endDate,
  currentDate,
  onChange,
  markers = [],
  showPlayback = false,
  playbackSpeed = 1,
  onPlaybackChange,
  compact = false,
}: TimelineScrubberProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const percentage = Math.max(0, Math.min(100, (currentDays / totalDays) * 100));
  
  // Playback effect
  React.useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + playbackSpeed);
      
      if (nextDate >= endDate) {
        setIsPlaying(false);
        onPlaybackChange?.(false);
        onChange(endDate);
      } else {
        onChange(nextDate);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, currentDate, endDate, playbackSpeed, onChange, onPlaybackChange]);
  
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const days = Math.round(pct * totalDays);
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + days);
    onChange(newDate);
  }, [startDate, totalDays, onChange]);
  
  const handleStep = useCallback((direction: 'back' | 'forward', amount: 'day' | 'week' | 'month') => {
    const newDate = new Date(currentDate);
    const multiplier = direction === 'back' ? -1 : 1;
    
    if (amount === 'day') newDate.setDate(newDate.getDate() + multiplier);
    else if (amount === 'week') newDate.setDate(newDate.getDate() + (7 * multiplier));
    else newDate.setMonth(newDate.getMonth() + multiplier);
    
    if (newDate >= startDate && newDate <= endDate) {
      onChange(newDate);
    }
  }, [currentDate, startDate, endDate, onChange]);
  
  const togglePlayback = useCallback(() => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onPlaybackChange?.(newState);
  }, [isPlaying, onPlaybackChange]);
  
  return (
    <div className={`${compact ? 'p-3' : 'p-4'} bg-surface-elevated border border-border rounded-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-accent-purple" />
          <span className={`font-medium text-text-primary ${compact ? 'text-sm' : ''}`}>
            Timeline
          </span>
        </div>
        <Badge color="blue" size="sm">
          {formatDateFull(currentDate)}
        </Badge>
      </div>
      
      {/* Track */}
      <div className="relative mb-3">
        <div
          onClick={handleTrackClick}
          className="h-2 bg-surface-card rounded-full cursor-pointer relative overflow-hidden"
        >
          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-accent-blue rounded-full"
            style={{ width: `${percentage}%` }}
          />
          
          {/* Markers */}
          {markers.map((marker, idx) => {
            const markerDays = Math.ceil((marker.date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const markerPct = (markerDays / totalDays) * 100;
            return (
              <div
                key={idx}
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${markerTypeColors[marker.type || 'event']}`}
                style={{ left: `${markerPct}%` }}
                title={`${marker?.label ?? ''} - ${formatDateFull(marker.date)}`}
              />
            );
          })}
        </div>
        
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-accent-blue rounded-full shadow cursor-grab"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      
      {/* Date labels */}
      <div className="flex justify-between text-xs text-text-muted mb-3">
        <span>{formatDateShort(startDate)}</span>
        <span>{formatDateShort(endDate)}</span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleStep('back', 'month')}
          className="p-1.5 hover:bg-surface-card rounded transition-colors"
          title="Back 1 month"
        >
          <Rewind className="w-4 h-4 text-text-muted" />
        </button>
        <button
          onClick={() => handleStep('back', 'week')}
          className="p-1.5 hover:bg-surface-card rounded transition-colors"
          title="Back 1 week"
        >
          <ChevronLeft className="w-4 h-4 text-text-muted" />
        </button>
        
        {showPlayback && (
          <button
            onClick={togglePlayback}
            className={`
              p-2 rounded-full transition-colors
              ${isPlaying ? 'bg-accent-blue text-white' : 'bg-surface-card hover:bg-surface-elevated text-text-secondary'}
            `}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        
        <button
          onClick={() => handleStep('forward', 'week')}
          className="p-1.5 hover:bg-surface-card rounded transition-colors"
          title="Forward 1 week"
        >
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </button>
        <button
          onClick={() => handleStep('forward', 'month')}
          className="p-1.5 hover:bg-surface-card rounded transition-colors"
          title="Forward 1 month"
        >
          <FastForward className="w-4 h-4 text-text-muted" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// AS-OF SELECTOR COMPONENT
// ============================================================================

export function AsOfSelector({
  value,
  onChange,
  snapshotDates = [],
  label = 'View As Of',
  showReset = true,
  disabled = false,
}: AsOfSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customDate, setCustomDate] = useState<string>(formatDateInput(value));
  
  const isViewingPast = value !== null;
  
  const handleSnapshotSelect = useCallback((date: Date) => {
    onChange(date);
    setIsOpen(false);
  }, [onChange]);
  
  const handleCustomApply = useCallback(() => {
    const date = parseDateInput(customDate);
    onChange(date);
    setIsOpen(false);
  }, [customDate, onChange]);
  
  const handleReset = useCallback(() => {
    onChange(null);
    setCustomDate('');
  }, [onChange]);
  
  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border
          transition-colors
          ${isViewingPast
            ? 'bg-accent-purple/10 border-accent-purple/30 text-accent-purple'
            : 'bg-surface-card border-border text-text-secondary hover:border-accent-purple/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <History className="w-4 h-4" />
        <span className="text-sm">
          {isViewingPast ? `As of ${formatDateShort(value)}` : label}
        </span>
        {isViewingPast && showReset && (
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="p-0.5 hover:bg-accent-purple/20 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-surface-elevated border border-border rounded-xl shadow-xl w-72 right-0">
          {/* Warning banner */}
          <div className="p-3 bg-accent-amber/10 border-b border-accent-amber/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-accent-amber flex-shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary">
                <p className="font-medium text-accent-amber">Historical View Mode</p>
                <p className="mt-0.5">Data will reflect the state at the selected point in time.</p>
              </div>
            </div>
          </div>
          
          {/* Snapshot dates */}
          {snapshotDates.length > 0 && (
            <div className="p-3 border-b border-border">
              <div className="text-xs font-medium text-text-muted mb-2">Regulatory Snapshots</div>
              <div className="space-y-1.5">
                {snapshotDates.map((snapshot, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSnapshotSelect(snapshot.date)}
                    className={`
                      w-full flex items-center gap-2 p-2 rounded-lg text-left
                      transition-colors
                      ${value?.getTime() === snapshot.date.getTime()
                        ? 'bg-accent-purple/10 border border-accent-purple/30'
                        : 'bg-surface-card hover:bg-surface-elevated'
                      }
                    `}
                  >
                    <CalendarRange className="w-4 h-4 text-text-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary">{snapshot.label}</div>
                      <div className="text-xs text-text-muted">{formatDateFull(snapshot.date)}</div>
                      {snapshot.description && (
                        <div className="text-xs text-text-secondary mt-0.5">{snapshot.description}</div>
                      )}
                    </div>
                    {value?.getTime() === snapshot.date.getTime() && (
                      <Check className="w-4 h-4 text-accent-purple" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Custom date */}
          <div className="p-3">
            <div className="text-xs font-medium text-text-muted mb-2">Custom Date</div>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                max={formatDateInput(new Date())}
                className="flex-1 px-2 py-1.5 text-sm bg-surface-card border border-border rounded-lg"
              />
              <Button variant="primary" size="sm" onClick={handleCustomApply}>
                Apply
              </Button>
            </div>
          </div>
          
          {/* Reset */}
          {showReset && isViewingPast && (
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                icon={<RotateCcw className="w-4 h-4" />}
                onClick={handleReset}
              >
                Return to Current View
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT FILTER BAR COMPONENT
// ============================================================================

interface TemporalFilterBarProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  asOfDate?: Date | null;
  onAsOfChange?: (date: Date | null) => void;
  showAsOf?: boolean;
  className?: string;
}

export function TemporalFilterBar({
  dateRange,
  onDateRangeChange,
  asOfDate,
  onAsOfChange,
  showAsOf = false,
  className = '',
}: TemporalFilterBarProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <TemporalFilter
        value={dateRange}
        onChange={onDateRangeChange}
        compact
        showPresets
        presets={['today', 'last-7-days', 'last-30-days', 'this-quarter', 'all-time']}
      />
      
      {showAsOf && onAsOfChange && (
        <AsOfSelector
          value={asOfDate || null}
          onChange={onAsOfChange}
          snapshotDates={[
            { date: new Date('2024-12-01'), label: 'Q4 2024 Close', description: 'End of quarter snapshot' },
            { date: new Date('2024-09-30'), label: 'Q3 2024 Close', description: 'End of quarter snapshot' },
          ]}
        />
      )}
    </div>
  );
}

export default TemporalFilter;
