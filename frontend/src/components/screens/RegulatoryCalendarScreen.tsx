

import { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarClock,
  Clock,
  Users,
  FileText,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Flag,
  Timer,
  Video,
  Phone,
  MapPin,
  MessageSquare,
  List,
  LayoutGrid,
  TrendingUp,
  Eye,
  Edit,
  ChevronDown,
  ChevronUp,
  Pill,
  ArrowRight
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useProducts } from '@/stores/products-store';

// ============================================================================
// TYPES
// ============================================================================

type RegCalendarView = 'calendar' | 'meetings' | 'deadlines' | 'milestones' | 'analytics';
type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';
type MeetingCategory = 'fda' | 'ema' | 'pmda' | 'nmpa' | 'health-canada' | 'other-ha' | 'internal';
type MeetingRequestStatus = 'draft' | 'internal-review' | 'approved-to-submit' | 'submitted' | 'acknowledged' | 'date-proposed' | 'confirmed' | 'completed' | 'cancelled' | 'denied';
type MilestoneStatus = 'planned' | 'on-track' | 'at-risk' | 'delayed' | 'completed' | 'cancelled';
type DeadlineStatus = 'upcoming' | 'due-soon' | 'overdue' | 'completed' | 'extension-requested' | 'waived' | 'cancelled';
type CalendarEventType = 'meeting' | 'deadline' | 'milestone' | 'submission' | 'approval' | 'inspection' | 'conference' | 'internal' | 'reminder';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: CalendarEventType;
  date: string;
  endDate?: string;
  allDay: boolean;
  time?: string;
  duration?: number;
  status: string;
  agency?: string;
  product?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  color: string;
}

interface RegulatoryMeeting {
  id: string;
  title: string;
  category: MeetingCategory;
  meetingType: string;
  agency: string;
  product?: string;
  status: MeetingRequestStatus;
  format: 'in-person' | 'teleconference' | 'video-conference' | 'written-response-only';
  requestSubmittedDate?: string;
  confirmedDate?: string;
  confirmedTime?: string;
  duration?: number;
  briefingDocDueDate?: string;
  attendeeCount: number;
  questionCount: number;
}

interface RegulatoryDeadline {
  id: string;
  title: string;
  deadlineType: string;
  dueDate: string;
  status: DeadlineStatus;
  agency: string;
  product?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  daysUntilDue: number;
  owner: string;
}

interface RegulatoryMilestone {
  id: string;
  title: string;
  category: string;
  targetDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  product?: string;
  percentComplete: number;
  criticalPath: boolean;
  owner: string;
}

// ============================================================================
// COLOR MAPS
// ============================================================================

const MEETING_STATUS_COLORS: Record<MeetingRequestStatus, BadgeColor> = {
  'draft': 'slate',
  'internal-review': 'amber',
  'approved-to-submit': 'blue',
  'submitted': 'purple',
  'acknowledged': 'violet',
  'date-proposed': 'cyan',
  'confirmed': 'green',
  'completed': 'emerald',
  'cancelled': 'slate',
  'denied': 'red',
};

const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, BadgeColor> = {
  'planned': 'slate',
  'on-track': 'green',
  'at-risk': 'amber',
  'delayed': 'red',
  'completed': 'emerald',
  'cancelled': 'slate',
};

const DEADLINE_STATUS_COLORS: Record<DeadlineStatus, BadgeColor> = {
  'upcoming': 'blue',
  'due-soon': 'amber',
  'overdue': 'red',
  'completed': 'green',
  'extension-requested': 'purple',
  'waived': 'slate',
  'cancelled': 'slate',
};

const PRIORITY_COLORS: Record<string, BadgeColor> = {
  'critical': 'red',
  'high': 'amber',
  'medium': 'blue',
  'low': 'slate',
};

const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  'meeting': 'bg-accent-blue',
  'deadline': 'bg-accent-red',
  'milestone': 'bg-accent-green',
  'submission': 'bg-accent-purple',
  'approval': 'bg-emerald-500',
  'inspection': 'bg-orange-500',
  'conference': 'bg-cyan-500',
  'internal': 'bg-slate-500',
  'reminder': 'bg-amber-500',
};

const AGENCY_COLORS: Record<string, string> = {
  'FDA': 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  'EMA': 'text-purple-600 bg-purple-50 dark:bg-purple-900/30',
  'PMDA': 'text-red-600 bg-red-50 dark:bg-red-900/30',
  'NMPA': 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
  'Health Canada': 'text-green-600 bg-green-50 dark:bg-green-900/30',
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_MEETINGS: RegulatoryMeeting[] = [
  {
    id: 'mtg-001',
    title: 'Pre-NDA Meeting - Nexavant',
    category: 'fda',
    meetingType: 'pre-nda',
    agency: 'FDA',
    product: 'Nexavant (LIG-2847)',
    status: 'confirmed',
    format: 'video-conference',
    requestSubmittedDate: '2025-11-15',
    confirmedDate: '2026-01-15',
    confirmedTime: '10:00 AM EST',
    duration: 60,
    briefingDocDueDate: '2025-12-15',
    attendeeCount: 8,
    questionCount: 12,
  },
  {
    id: 'mtg-002',
    title: 'End of Phase 2 Meeting - Velorix',
    category: 'fda',
    meetingType: 'end-of-phase-2',
    agency: 'FDA',
    product: 'Velorix (LIG-3301)',
    status: 'submitted',
    format: 'video-conference',
    requestSubmittedDate: '2025-12-20',
    briefingDocDueDate: '2026-02-01',
    attendeeCount: 6,
    questionCount: 8,
  },
  {
    id: 'mtg-003',
    title: 'Scientific Advice Meeting',
    category: 'ema',
    meetingType: 'scientific-advice',
    agency: 'EMA',
    product: 'Nexavant (LIG-2847)',
    status: 'date-proposed',
    format: 'video-conference',
    requestSubmittedDate: '2025-12-01',
    briefingDocDueDate: '2026-01-20',
    attendeeCount: 5,
    questionCount: 6,
  },
  {
    id: 'mtg-004',
    title: 'Pre-IND Meeting - LIG-4521',
    category: 'fda',
    meetingType: 'pre-ind',
    agency: 'FDA',
    product: 'LIG-4521',
    status: 'internal-review',
    format: 'teleconference',
    attendeeCount: 4,
    questionCount: 5,
  },
  {
    id: 'mtg-005',
    title: 'Type C Meeting - CMC Discussion',
    category: 'fda',
    meetingType: 'type-c',
    agency: 'FDA',
    product: 'Nexavant (LIG-2847)',
    status: 'draft',
    format: 'written-response-only',
    attendeeCount: 0,
    questionCount: 3,
  },
];

const MOCK_DEADLINES: RegulatoryDeadline[] = [
  {
    id: 'dl-001',
    title: 'PDUFA Goal Date - Nexavant NDA',
    deadlineType: 'pdufa-goal-date',
    dueDate: '2026-06-15',
    status: 'upcoming',
    agency: 'FDA',
    product: 'Nexavant (LIG-2847)',
    priority: 'critical',
    daysUntilDue: 167,
    owner: 'Sarah Chen',
  },
  {
    id: 'dl-002',
    title: 'Pre-NDA Briefing Document',
    deadlineType: 'briefing-document',
    dueDate: '2025-12-15',
    status: 'due-soon',
    agency: 'FDA',
    product: 'Nexavant (LIG-2847)',
    priority: 'critical',
    daysUntilDue: -15,
    owner: 'Michael Torres',
  },
  {
    id: 'dl-003',
    title: 'HAQ Response - FDA IR Batch 2',
    deadlineType: 'response-due',
    dueDate: '2026-01-10',
    status: 'upcoming',
    agency: 'FDA',
    product: 'Nexavant (LIG-2847)',
    priority: 'high',
    daysUntilDue: 11,
    owner: 'Jennifer Walsh',
  },
  {
    id: 'dl-004',
    title: 'Annual Report - Velorix IND',
    deadlineType: 'annual-report',
    dueDate: '2026-02-28',
    status: 'upcoming',
    agency: 'FDA',
    product: 'Velorix (LIG-3301)',
    priority: 'medium',
    daysUntilDue: 60,
    owner: 'David Kim',
  },
  {
    id: 'dl-005',
    title: 'DSUR Submission',
    deadlineType: 'periodic-report',
    dueDate: '2026-01-31',
    status: 'upcoming',
    agency: 'EMA',
    product: 'Nexavant (LIG-2847)',
    priority: 'high',
    daysUntilDue: 32,
    owner: 'Sarah Chen',
  },
  {
    id: 'dl-006',
    title: 'Pediatric Study Plan Response',
    deadlineType: 'pediatric',
    dueDate: '2025-12-28',
    status: 'overdue',
    agency: 'FDA',
    product: 'Velorix (LIG-3301)',
    priority: 'high',
    daysUntilDue: -2,
    owner: 'Emily Rodriguez',
  },
];

const MOCK_MILESTONES: RegulatoryMilestone[] = [
  {
    id: 'ms-001',
    title: 'NDA Submission - Nexavant',
    category: 'regulatory-submission',
    targetDate: '2026-01-31',
    status: 'on-track',
    product: 'Nexavant (LIG-2847)',
    percentComplete: 85,
    criticalPath: true,
    owner: 'Sarah Chen',
  },
  {
    id: 'ms-002',
    title: 'Phase 3 Database Lock',
    category: 'clinical-trial',
    targetDate: '2025-12-31',
    status: 'at-risk',
    product: 'Nexavant (LIG-2847)',
    percentComplete: 92,
    criticalPath: true,
    owner: 'Michael Torres',
  },
  {
    id: 'ms-003',
    title: 'FDA Approval - Nexavant',
    category: 'regulatory-approval',
    targetDate: '2026-06-15',
    status: 'planned',
    product: 'Nexavant (LIG-2847)',
    percentComplete: 0,
    criticalPath: true,
    owner: 'Sarah Chen',
  },
  {
    id: 'ms-004',
    title: 'EOP2 Package Completion',
    category: 'regulatory-submission',
    targetDate: '2026-02-15',
    status: 'on-track',
    product: 'Velorix (LIG-3301)',
    percentComplete: 45,
    criticalPath: true,
    owner: 'Jennifer Walsh',
  },
  {
    id: 'ms-005',
    title: 'Commercial Launch - Nexavant',
    category: 'commercial',
    targetDate: '2026-09-01',
    status: 'planned',
    product: 'Nexavant (LIG-2847)',
    percentComplete: 0,
    criticalPath: false,
    owner: 'David Kim',
  },
];

const generateCalendarEvents = (): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  
  MOCK_MEETINGS.forEach(m => {
    if (m.confirmedDate) {
      events.push({
        id: `evt-${m.id}`,
        title: m.title,
        eventType: 'meeting',
        date: m.confirmedDate,
        allDay: false,
        time: m.confirmedTime,
        duration: m.duration,
        status: m.status,
        agency: m.agency,
        product: m.product,
        color: EVENT_TYPE_COLORS.meeting,
      });
    }
    if (m.briefingDocDueDate) {
      events.push({
        id: `evt-brief-${m.id}`,
        title: `Briefing Doc Due: ${m.title.split(' - ')[1] || m.title}`,
        eventType: 'deadline',
        date: m.briefingDocDueDate,
        allDay: true,
        status: 'upcoming',
        agency: m.agency,
        product: m.product,
        priority: 'high',
        color: EVENT_TYPE_COLORS.deadline,
      });
    }
  });
  
  MOCK_DEADLINES.forEach(d => {
    events.push({
      id: `evt-${d.id}`,
      title: d.title,
      eventType: 'deadline',
      date: d.dueDate,
      allDay: true,
      status: d.status,
      agency: d.agency,
      product: d.product,
      priority: d.priority,
      color: EVENT_TYPE_COLORS.deadline,
    });
  });
  
  MOCK_MILESTONES.forEach(m => {
    events.push({
      id: `evt-${m.id}`,
      title: m.title,
      eventType: 'milestone',
      date: m.targetDate,
      allDay: true,
      status: m.status,
      product: m.product,
      color: EVENT_TYPE_COLORS.milestone,
    });
  });
  
  return events;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMonthYear = (year: number, month: number): string => {
  const date = new Date(year, month);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const isToday = (year: number, month: number, day: number): boolean => {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
};

const isSameDay = (dateStr: string, year: number, month: number, day: number): boolean => {
  const date = new Date(dateStr);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface RegulatoryCalendarScreenProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function RegulatoryCalendarScreen({ filters: _filters }: RegulatoryCalendarScreenProps) {
  const [activeView, setActiveView] = useState<RegCalendarView>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('month');
  const [currentYear, setCurrentYear] = useState(2025);
  const [currentMonth, setCurrentMonth] = useState(11);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchText] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<CalendarEventType[]>(['meeting', 'deadline', 'milestone']);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const { filterByProductName, isFiltered } = useProductFilter();
  const allProducts = useProducts();

  // v0.124.5: Local calendar-specific filters (product / application / therapeutic area)
  const [calProductFilter, setCalProductFilter] = useState<string>('all');
  const [calAppFilter, setCalAppFilter] = useState<string>('all');
  const [calTAFilter, setCalTAFilter] = useState<string>('all');
  const [calAgencyFilter, setCalAgencyFilter] = useState<string>('all');

  // Derive unique values from mock data for filter dropdowns
  const calendarProducts = useMemo(() => {
    const names = new Set([...MOCK_MEETINGS.map(m => m.product ?? ''), ...MOCK_DEADLINES.map(d => d.product ?? '')].filter(Boolean));
    return Array.from(names).sort();
  }, []);

  // Mock applications tied to products
  const PRODUCT_APPLICATION_MAP: Record<string, string> = {
    'Nexavant (LIG-2847)': 'NDA-215847',
    'Velorix (LIG-3301)': 'IND-137224',
    'LIG-4521': 'IND-148990',
  };

  // Derive therapeutic areas from products store (fall back to hardcoded)
  const therapeuticAreas = useMemo(() => {
    const fromStore = Array.from(new Set(allProducts.map(p => p.therapeuticArea).filter(Boolean)));
    if (fromStore.length > 0) return fromStore.sort();
    return ['Oncology', 'Cardiology', 'Neurology'].sort();
  }, [allProducts]);

  // Helper: does a product name match active filters?
  const matchesCalFilters = (productName?: string, agency?: string): boolean => {
    if (calProductFilter !== 'all' && productName !== calProductFilter) return false;
    if (calAppFilter !== 'all' && productName && PRODUCT_APPLICATION_MAP[productName] !== calAppFilter) return false;
    if (calTAFilter !== 'all') {
      const prod = allProducts.find(p => productName && (productName.includes(p.id.toUpperCase()) || productName.toLowerCase().includes((p.name ?? '').toLowerCase().split(' ')[0])));
      if (prod && prod.therapeuticArea !== calTAFilter) return false;
    }
    if (calAgencyFilter !== 'all' && agency && !agency.toUpperCase().includes(calAgencyFilter)) return false;
    return true;
  };
  
  // v0.21.9: Toast and modal state
  const toast = useToast();
  const [showModal, setShowModal] = useState<{ type: 'meeting' | 'deadline' | 'milestone' | 'filter' | 'view-meeting' | 'edit-meeting' | 'briefing' | 'questions' | null; data?: Record<string, unknown> }>({ type: null });
  
  const calendarEvents = useMemo(() => generateCalendarEvents(), []);
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };
  
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(evt => {
      if (!selectedEventTypes.includes(evt.eventType)) return false;
      if (searchText && !evt.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (isFiltered && evt.product) return filterByProductName([{ product: evt.product }]).length > 0;
      // v0.124.5: local calendar filters
      if (!matchesCalFilters(evt.product)) return false;
      return true;
    });
  }, [calendarEvents, selectedEventTypes, searchText, isFiltered, filterByProductName, calProductFilter, calAppFilter, calTAFilter, calAgencyFilter]);

  const visibleMeetings = useMemo(() => filterByProductName(MOCK_MEETINGS).filter(m => matchesCalFilters(m.product, m.agency)), [filterByProductName, calProductFilter, calAppFilter, calTAFilter, calAgencyFilter]);
  const visibleDeadlines = useMemo(() => filterByProductName(MOCK_DEADLINES).filter(d => matchesCalFilters(d.product)), [filterByProductName, calProductFilter, calAppFilter, calTAFilter, calAgencyFilter]);
  
  const getEventsForDay = (year: number, month: number, day: number) => {
    return filteredEvents.filter(evt => isSameDay(evt.date, year, month, day));
  };
  
  const stats = useMemo(() => {
    const upcomingMeetings = visibleMeetings.filter(m => ['confirmed', 'date-proposed', 'submitted'].includes(m.status)).length;
    const overdueDeadlines = visibleDeadlines.filter(d => d.status === 'overdue').length;
    const dueSoon = visibleDeadlines.filter(d => d.status === 'due-soon').length;
    const atRiskMilestones = MOCK_MILESTONES.filter(m => m.status === 'at-risk').length;
    return { upcomingMeetings, overdueDeadlines, dueSoon, atRiskMilestones };
  }, [visibleMeetings, visibleDeadlines]);
  
  // ============================================================================
  // RENDER CALENDAR GRID
  // ============================================================================
  
  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: React.ReactNode[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 border-r border-b border-border bg-surface-elevated/50" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(currentYear, currentMonth, day);
      const isCurrentDay = isToday(currentYear, currentMonth, day);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      
      days.push(
        <div
          key={day}
          className={`h-28 border-r border-b border-border p-1 cursor-pointer transition-colors
            ${isCurrentDay ? 'bg-accent-blue/5' : 'bg-surface-card hover:bg-surface-elevated'}
            ${isSelected ? 'ring-2 ring-accent-blue ring-inset' : ''}`}
          onClick={() => setSelectedDate(isSelected ? null : dateStr)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full
              ${isCurrentDay ? 'bg-accent-blue text-white' : 'text-text-primary'}`}>
              {day}
            </span>
            {dayEvents.length > 3 && <span className="text-xs text-text-muted">+{dayEvents.length - 3}</span>}
          </div>
          <div className="space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 3).map(evt => (
              <div key={evt.id} className={`text-xs px-1 py-0.5 rounded truncate text-white ${evt?.color ?? ''}`} title={evt.title}>
                {evt.time && <span className="opacity-75">{evt.time.split(' ')[0]} </span>}
                {evt.title}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = firstDay + daysInMonth; i < totalCells; i++) {
      days.push(<div key={`empty-end-${i}`} className="h-28 border-r border-b border-border bg-surface-elevated/50" />);
    }
    
    return (
      <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map(name => (
            <div key={name} className="py-2 text-center text-sm font-medium text-text-secondary bg-surface-elevated border-r border-border last:border-r-0">
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{days}</div>
      </div>
    );
  };
  
  // ============================================================================
  // RENDER MEETINGS VIEW
  // ============================================================================
  
  const renderMeetingsView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Meetings" value={visibleMeetings.length} icon={<Users className="w-5 h-5" />} />
        <StatCard label="Confirmed" value={visibleMeetings.filter(m => m.status === 'confirmed').length} icon={<CheckCircle className="w-5 h-5" />} trend={{ value: 2, direction: 'up' }} />
        <StatCard label="Pending" value={visibleMeetings.filter(m => ['submitted', 'date-proposed', 'internal-review'].includes(m.status)).length} icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Draft" value={visibleMeetings.filter(m => m.status === 'draft').length} icon={<FileText className="w-5 h-5" />} />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Regulatory Meetings</h3>
            <Button variant="primary" size="sm" onClick={() => {
              setShowModal({ type: 'meeting' });
            }}><Plus className="w-4 h-4 mr-1" /> New Meeting Request</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleMeetings.map(meeting => (
              <div key={meeting.id} className="border border-border rounded-lg bg-surface-card overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-surface-elevated transition-colors" onClick={() => setExpandedMeetingId(expandedMeetingId === meeting.id ? null : meeting.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${AGENCY_COLORS[meeting.agency] || 'bg-slate-100 text-slate-600'}`}>{meeting.agency}</span>
                        <Badge color={MEETING_STATUS_COLORS[meeting.status]} size="sm">{meeting.status.replace(/-/g, ' ')}</Badge>
                        <span className="text-xs text-text-muted capitalize">{meeting.meetingType.replace(/-/g, ' ')}</span>
                      </div>
                      <h4 className="font-medium text-text-primary">{meeting.title}</h4>
                      {meeting.product && <p className="text-sm text-text-secondary flex items-center gap-1 mt-1"><Pill className="w-3 h-3" /> {meeting.product}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      {meeting.confirmedDate && (
                        <div className="text-right">
                          <div className="font-medium text-text-primary">{formatDate(meeting.confirmedDate)}</div>
                          <div>{meeting.confirmedTime}</div>
                        </div>
                      )}
                      {expandedMeetingId === meeting.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
                
                {expandedMeetingId === meeting.id && (
                  <div className="border-t border-border p-4 bg-surface-elevated space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Format</span>
                        <p className="font-medium text-text-primary flex items-center gap-1 capitalize">
                          {meeting.format === 'video-conference' && <Video className="w-4 h-4" />}
                          {meeting.format === 'teleconference' && <Phone className="w-4 h-4" />}
                          {meeting.format === 'in-person' && <MapPin className="w-4 h-4" />}
                          {meeting.format === 'written-response-only' && <FileText className="w-4 h-4" />}
                          {meeting.format.replace(/-/g, ' ')}
                        </p>
                      </div>
                      <div><span className="text-text-muted">Duration</span><p className="font-medium text-text-primary">{meeting.duration ? `${meeting.duration} min` : 'TBD'}</p></div>
                      <div><span className="text-text-muted">Attendees</span><p className="font-medium text-text-primary">{meeting.attendeeCount} sponsor</p></div>
                      <div><span className="text-text-muted">Questions</span><p className="font-medium text-text-primary">{meeting.questionCount} prepared</p></div>
                    </div>
                    {meeting.briefingDocDueDate && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-800 dark:text-amber-200">Briefing document due: <strong>{formatDate(meeting.briefingDocDueDate)}</strong></span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setShowModal({ type: 'view-meeting', data: { id: meeting.id, title: meeting.title } })}><Eye className="w-4 h-4 mr-1" /> View Details</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowModal({ type: 'edit-meeting', data: { id: meeting.id, title: meeting.title } })}><Edit className="w-4 h-4 mr-1" /> Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowModal({ type: 'briefing', data: { id: meeting.id, title: meeting.title } })}><FileText className="w-4 h-4 mr-1" /> Briefing Doc</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowModal({ type: 'questions', data: { id: meeting.id, title: meeting.title } })}><MessageSquare className="w-4 h-4 mr-1" /> Questions</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // ============================================================================
  // RENDER DEADLINES VIEW
  // ============================================================================
  
  const renderDeadlinesView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Deadlines" value={visibleDeadlines.length} icon={<Timer className="w-5 h-5" />} />
        <StatCard label="Overdue" value={stats.overdueDeadlines} icon={<AlertTriangle className="w-5 h-5" />} trend={{ value: stats.overdueDeadlines, direction: 'up' }} />
        <StatCard label="Due This Week" value={stats.dueSoon} icon={<Clock className="w-5 h-5" />} />
        <StatCard label="Completed" value={visibleDeadlines.filter(d => d.status === 'completed').length} icon={<CheckCircle className="w-5 h-5" />} />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Regulatory Deadlines</h3>
            <Button variant="primary" size="sm" onClick={() => {
              setShowModal({ type: 'deadline' });
            }}><Plus className="w-4 h-4 mr-1" /> Add Deadline</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {visibleDeadlines.sort((a, b) => a.daysUntilDue - b.daysUntilDue).map(deadline => (
              <div key={deadline.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer
                ${deadline.status === 'overdue' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 
                  deadline.status === 'due-soon' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 
                  'border-border bg-surface-card hover:bg-surface-elevated'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                    ${deadline.status === 'overdue' ? 'bg-red-100 text-red-600' : 
                      deadline.status === 'due-soon' ? 'bg-amber-100 text-amber-600' : 
                      'bg-blue-100 text-blue-600'}`}>
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${AGENCY_COLORS[deadline.agency] || 'bg-slate-100 text-slate-600'}`}>{deadline.agency}</span>
                      <Badge color={PRIORITY_COLORS[deadline.priority]} size="sm">{deadline.priority}</Badge>
                      <Badge color={DEADLINE_STATUS_COLORS[deadline.status]} size="sm">{deadline.status.replace(/-/g, ' ')}</Badge>
                    </div>
                    <h4 className="font-medium text-text-primary mt-1">{deadline.title}</h4>
                    {deadline.product && <p className="text-sm text-text-secondary">{deadline.product}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${deadline.daysUntilDue < 0 ? 'text-red-600' : deadline.daysUntilDue <= 7 ? 'text-amber-600' : 'text-text-primary'}`}>
                    {deadline.daysUntilDue < 0 ? `${Math.abs(deadline.daysUntilDue)} days overdue` : deadline.daysUntilDue === 0 ? 'Due today' : `${deadline.daysUntilDue} days`}
                  </div>
                  <div className="text-sm text-text-muted">{formatDate(deadline.dueDate)}</div>
                  <div className="text-xs text-text-muted mt-1">Owner: {deadline.owner}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // ============================================================================
  // RENDER MILESTONES VIEW
  // ============================================================================
  
  const renderMilestonesView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Milestones" value={MOCK_MILESTONES.length} icon={<Flag className="w-5 h-5" />} />
        <StatCard label="On Track" value={MOCK_MILESTONES.filter(m => m.status === 'on-track').length} icon={<CheckCircle className="w-5 h-5" />} trend={{ value: 2, direction: 'up' }} />
        <StatCard label="At Risk" value={stats.atRiskMilestones} icon={<AlertTriangle className="w-5 h-5" />} trend={{ value: 1, direction: 'up' }} />
        <StatCard label="Critical Path" value={MOCK_MILESTONES.filter(m => m.criticalPath).length} icon={<Target className="w-5 h-5" />} />
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Regulatory Milestones</h3>
            <Button variant="primary" size="sm" onClick={() => {
              setShowModal({ type: 'milestone' });
            }}><Plus className="w-4 h-4 mr-1" /> Add Milestone</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_MILESTONES.map(milestone => (
              <div key={milestone.id} className="border border-border rounded-lg p-4 bg-surface-card hover:bg-surface-elevated transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color={MILESTONE_STATUS_COLORS[milestone.status]} size="sm">{milestone.status.replace(/-/g, ' ')}</Badge>
                      {milestone.criticalPath && <Badge color="red" size="sm">Critical Path</Badge>}
                      <span className="text-xs text-text-muted capitalize">{milestone.category.replace(/-/g, ' ')}</span>
                    </div>
                    <h4 className="font-medium text-text-primary">{milestone.title}</h4>
                    {milestone.product && <p className="text-sm text-text-secondary mt-1">{milestone.product}</p>}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-text-primary">{formatDate(milestone.targetDate)}</div>
                    <div className="text-sm text-text-muted">Owner: {milestone.owner}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-muted">Progress</span>
                    <span className="font-medium text-text-primary">{milestone.percentComplete}%</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      milestone.status === 'at-risk' ? 'bg-amber-500' :
                      milestone.status === 'delayed' ? 'bg-red-500' :
                      milestone.status === 'completed' ? 'bg-emerald-500' : 'bg-accent-blue'
                    }`} style={{ width: `${milestone.percentComplete}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // ============================================================================
  // RENDER ANALYTICS VIEW
  // ============================================================================
  
  const renderAnalyticsView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader><h3 className="font-semibold text-text-primary">Meetings by Agency</h3></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[{ agency: 'FDA', count: 4, color: 'bg-blue-500' }, { agency: 'EMA', count: 1, color: 'bg-purple-500' }, { agency: 'PMDA', count: 0, color: 'bg-red-500' }, { agency: 'Health Canada', count: 0, color: 'bg-green-500' }].map(item => (
                <div key={item.agency} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item?.color ?? ''}`} />
                  <span className="text-sm text-text-secondary flex-1">{item.agency}</span>
                  <span className="font-medium text-text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader><h3 className="font-semibold text-text-primary">Deadlines by Priority</h3></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[{ priority: 'Critical', count: 2, color: 'bg-red-500' }, { priority: 'High', count: 3, color: 'bg-amber-500' }, { priority: 'Medium', count: 1, color: 'bg-blue-500' }, { priority: 'Low', count: 0, color: 'bg-slate-500' }].map(item => (
                <div key={item.priority} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item?.color ?? ''}`} />
                  <span className="text-sm text-text-secondary flex-1">{item.priority}</span>
                  <span className="font-medium text-text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 md:col-span-2">
          <CardHeader><h3 className="font-semibold text-text-primary">Upcoming Critical Items (Next 30 Days)</h3></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...visibleDeadlines.filter(d => d.priority === 'critical'), ...MOCK_MILESTONES.filter(m => m.criticalPath && m.status !== 'completed')].slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-surface-elevated rounded-lg">
                  <div className="flex items-center gap-3">
                    {'dueDate' in item ? <Timer className="w-5 h-5 text-red-500" /> : <Flag className="w-5 h-5 text-accent-blue" />}
                    <div>
                      <div className="font-medium text-text-primary">{item.title}</div>
                      <div className="text-sm text-text-muted">{'dueDate' in item ? `Due: ${formatDate(item.dueDate)}` : `Target: ${formatDate(item.targetDate)}`}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className="h-full flex flex-col bg-surface-base">
      <ScreenHeader
        moduleId="regulatory-calendar"
        title="Regulatory Calendar"
        subtitle="Health authority meetings, submission deadlines, and milestone tracking"
        icon={<Calendar className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString() })], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const a = window.document.createElement('a');
              a.href = url; a.download = 'regulatory-calendar.json'; window.document.body.appendChild(a); a.click();
              window.document.body.removeChild(a); URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4 mr-1" />Export
            </Button>
            <CapabilityGate moduleId="regulatory" capability="author" inline>
              <Button variant="primary" size="sm" onClick={() => setShowModal({ type: 'meeting' })}>
                <Plus className="w-4 h-4 mr-1" />Add Event
              </Button>
            </CapabilityGate>
          </div>
        }
      />

      
      <div className="border-b border-border bg-surface-elevated px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-accent-blue" /><span className="text-text-muted">Meetings:</span><span className="font-medium text-text-primary">{stats.upcomingMeetings} upcoming</span></div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /><span className="text-text-muted">Deadlines:</span><span className="font-medium text-red-600">{stats.overdueDeadlines} overdue</span><span className="text-text-muted">·</span><span className="font-medium text-amber-600">{stats.dueSoon} due soon</span></div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2"><Flag className="w-4 h-4 text-amber-500" /><span className="text-text-muted">Milestones:</span><span className="font-medium text-amber-600">{stats.atRiskMilestones} at risk</span></div>
        </div>
      </div>

      {/* v0.124.5: Merged filter bar — Product / Application / Therapeutic Area / Agency */}
      <div className="border-b border-border bg-surface px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide flex-shrink-0">Filter:</span>
        <select
          value={calProductFilter}
          onChange={e => { setCalProductFilter(e.target.value); setCalAppFilter('all'); }}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        >
          <option value="all">All Products</option>
          {calendarProducts.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={calAppFilter}
          onChange={e => setCalAppFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        >
          <option value="all">All Applications</option>
          {(calProductFilter !== 'all'
            ? [PRODUCT_APPLICATION_MAP[calProductFilter]].filter(Boolean)
            : Object.values(PRODUCT_APPLICATION_MAP)
          ).map(app => <option key={app} value={app}>{app}</option>)}
        </select>
        <select
          value={calTAFilter}
          onChange={e => setCalTAFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        >
          <option value="all">All Therapeutic Areas</option>
          {therapeuticAreas.map(ta => <option key={ta} value={ta}>{ta}</option>)}
        </select>
        <select
          value={calAgencyFilter}
          onChange={e => setCalAgencyFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/40"
        >
          <option value="all">All Agencies</option>
          {['FDA', 'EMA', 'PMDA', 'HC', 'MHRA', 'TGA'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(calProductFilter !== 'all' || calAppFilter !== 'all' || calTAFilter !== 'all' || calAgencyFilter !== 'all') && (
          <button
            onClick={() => { setCalProductFilter('all'); setCalAppFilter('all'); setCalTAFilter('all'); setCalAgencyFilter('all'); }}
            className="text-xs text-text-muted hover:text-accent-blue transition-colors flex items-center gap-1 ml-1"
          >
            <span className="text-base leading-none">×</span> Clear
          </button>
        )}
      </div>
      
      <div className="border-b border-border bg-surface-card px-6">
        <div className="flex items-center gap-1">
          {[
            { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
            { id: 'meetings', label: 'Meetings', icon: <Users className="w-4 h-4" /> },
            { id: 'deadlines', label: 'Deadlines', icon: <Timer className="w-4 h-4" /> },
            { id: 'milestones', label: 'Milestones', icon: <Flag className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id as RegCalendarView)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeView === tab.id ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-primary'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}><ChevronLeft className="w-4 h-4" /></Button>
                  <h2 className="text-lg font-semibold text-text-primary min-w-[180px] text-center">{formatMonthYear(currentYear, currentMonth)}</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}><ChevronRight className="w-4 h-4" /></Button>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  {[{ id: 'month', icon: <LayoutGrid className="w-4 h-4" /> }, { id: 'week', icon: <CalendarDays className="w-4 h-4" /> }, { id: 'day', icon: <CalendarClock className="w-4 h-4" /> }, { id: 'agenda', icon: <List className="w-4 h-4" /> }].map(mode => (
                    <button key={mode.id} onClick={() => setCalendarViewMode(mode.id as CalendarViewMode)}
                      className={`p-2 transition-colors ${calendarViewMode === mode.id ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:bg-surface-elevated'}`}
                      title={mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}>{mode.icon}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {[{ type: 'meeting' as CalendarEventType, label: 'Meetings', color: 'bg-accent-blue' }, { type: 'deadline' as CalendarEventType, label: 'Deadlines', color: 'bg-accent-red' }, { type: 'milestone' as CalendarEventType, label: 'Milestones', color: 'bg-accent-green' }].map(filter => (
                    <button key={filter.type} onClick={() => setSelectedEventTypes(prev => prev.includes(filter.type) ? prev.filter(t => t !== filter.type) : [...prev, filter.type])}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedEventTypes.includes(filter.type) ? `${filter?.color ?? ''} text-white` : 'bg-surface-elevated text-text-muted hover:bg-surface-card'}`}>
                      <div className={`w-2 h-2 rounded-full ${selectedEventTypes.includes(filter.type) ? 'bg-white' : filter.color}`} />{filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {calendarViewMode === 'month' && renderCalendarGrid()}
            
            {calendarViewMode === 'agenda' && (
              <Card>
                <CardHeader><h3 className="font-semibold text-text-primary">Agenda View</h3></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 20).map(evt => (
                      <div key={evt.id} className="flex items-center gap-4 p-3 bg-surface-elevated rounded-lg">
                        <div className={`w-3 h-3 rounded-full ${evt?.color ?? ''}`} />
                        <div className="w-28 text-sm text-text-muted">{formatDate(evt.date)}</div>
                        <div className="flex-1">
                          <div className="font-medium text-text-primary">{evt.title}</div>
                          {evt.product && <div className="text-sm text-text-muted">{evt.product}</div>}
                        </div>
                        <Badge color={evt.priority ? PRIORITY_COLORS[evt.priority] : 'slate'} size="sm">{evt.eventType}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {(calendarViewMode === 'week' || calendarViewMode === 'day') && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">{calendarViewMode === 'week' ? 'Week View' : 'Day View'}</h3>
                  <p className="text-text-secondary">Detailed {calendarViewMode} view coming in v194</p>
                </CardContent>
              </Card>
            )}
            
            {selectedDate && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary">Events on {formatDate(selectedDate)}</h3>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}><XCircle className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dateEvents = filteredEvents.filter(evt => evt.date === selectedDate);
                    if (dateEvents.length === 0) return <p className="text-text-muted text-sm">No events scheduled for this date.</p>;
                    return (
                      <div className="space-y-2">
                        {dateEvents.map(evt => (
                          <div key={evt.id} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${evt?.color ?? ''}`} />
                            <div className="flex-1">
                              <div className="font-medium text-text-primary">{evt.title}</div>
                              {evt.time && <div className="text-sm text-text-muted">{evt.time}</div>}
                            </div>
                            <Badge color={evt.priority ? PRIORITY_COLORS[evt.priority] : 'slate'} size="sm">{evt.eventType}</Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {activeView === 'meetings' && renderMeetingsView()}
        {activeView === 'deadlines' && renderDeadlinesView()}
        {activeView === 'milestones' && renderMilestonesView()}
        {activeView === 'analytics' && renderAnalyticsView()}
      </div>

      {/* v0.21.9: Modal System */}
      <Modal
        isOpen={showModal.type !== null}
        onClose={() => setShowModal({ type: null })}
        title={
          showModal.type === 'meeting' ? 'New Meeting Request' :
          showModal.type === 'deadline' ? 'Add Deadline' :
          showModal.type === 'milestone' ? 'Add Milestone' :
          showModal.type === 'filter' ? 'Filter Calendar' :
          showModal.type === 'view-meeting' ? 'Meeting Details' :
          showModal.type === 'edit-meeting' ? 'Edit Meeting' :
          showModal.type === 'briefing' ? 'Briefing Document' :
          showModal.type === 'questions' ? 'Meeting Questions' : ''
        }
        size="md"
      >
        {showModal.type === 'meeting' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Agency</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option>FDA</option>
                <option>EMA</option>
                <option>PMDA</option>
                <option>NMPA</option>
                <option>Health Canada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Meeting Type</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option>Pre-IND</option>
                <option>Type A</option>
                <option>Type B</option>
                <option>Type C</option>
                <option>Pre-NDA/BLA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Meeting title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Requested Date</label>
              <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Cancel</Button>
              <Button variant="primary" onClick={() => { toast.success('Meeting request created'); setShowModal({ type: null }); }}>Create Request</Button>
            </div>
          </div>
        )}
        {showModal.type === 'deadline' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Agency</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option>FDA</option>
                <option>EMA</option>
                <option>PMDA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Deadline title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Due Date</label>
              <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Cancel</Button>
              <Button variant="primary" onClick={() => { toast.success('Deadline added'); setShowModal({ type: null }); }}>Add Deadline</Button>
            </div>
          </div>
        )}
        {showModal.type === 'milestone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Milestone title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Target Date</label>
              <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Owner</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Owner name..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="critical-path" className="rounded border-border" />
              <label htmlFor="critical-path" className="text-sm text-text-primary">Critical Path</label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Cancel</Button>
              <Button variant="primary" onClick={() => { toast.success('Milestone added'); setShowModal({ type: null }); }}>Add Milestone</Button>
            </div>
          </div>
        )}
        {showModal.type === 'filter' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Agency</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option value="">All Agencies</option>
                <option>FDA</option>
                <option>EMA</option>
                <option>PMDA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option value="">All Priorities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option value="">All Statuses</option>
                <option>Confirmed</option>
                <option>Pending</option>
                <option>Completed</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Clear</Button>
              <Button variant="primary" onClick={() => { toast.success('Filters applied'); setShowModal({ type: null }); }}>Apply Filters</Button>
            </div>
          </div>
        )}
        {(showModal.type === 'view-meeting' || showModal.type === 'edit-meeting') && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-elevated rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">{String(showModal.data?.title || 'Meeting')}</h4>
              <p className="text-sm text-text-secondary">Full meeting details and {showModal.type === 'edit-meeting' ? 'editing' : 'viewing'} capabilities.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Close</Button>
              {showModal.type === 'edit-meeting' && (
                <Button variant="primary" onClick={() => { toast.success('Meeting updated'); setShowModal({ type: null }); }}>Save Changes</Button>
              )}
            </div>
          </div>
        )}
        {showModal.type === 'briefing' && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-elevated rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Briefing Document</h4>
              <p className="text-sm text-text-secondary">Briefing document for: {String(showModal.data?.title || 'Meeting')}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Close</Button>
              <Button variant="primary" onClick={() => { toast.success('Briefing document opened'); setShowModal({ type: null }); }}>Open Document</Button>
            </div>
          </div>
        )}
        {showModal.type === 'questions' && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-elevated rounded-lg">
              <h4 className="font-medium text-text-primary mb-2">Meeting Questions</h4>
              <p className="text-sm text-text-secondary">Questions prepared for: {String(showModal.data?.title || 'Meeting')}</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal({ type: null })}>Close</Button>
              <Button variant="primary" onClick={() => { toast.success('Questions list opened'); setShowModal({ type: null }); }}>View Questions</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
