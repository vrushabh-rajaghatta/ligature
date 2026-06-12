

import { useState, useMemo } from 'react';
import {
  Users,
  UserCircle,
  Briefcase,
  BookOpen,
  Calendar,
  MessageSquare,
  Gift,
  BarChart3,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit,
  Star,
  StarOff,
  MapPin,
  Building,
  GraduationCap,
  Award,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  FileText,
  Presentation,
  Lightbulb,
  Target,
  Activity,
  Zap,
  Send,
  MoreHorizontal,
  RefreshCw,
  Pill,
  Stethoscope,
  FlaskConical,
  Shield,
  Sparkles,
  DollarSign,
  PieChart,
  LayoutGrid,
  List,
  Link2,
  Tag,
  Database,
  GitBranch,
  FileCheck,
  FileWarning,
  Layers,
  Workflow,
  CircleDot
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  sciPublications,
  scientificClaims,
  congresses as sciCongresses,
  dataIntegrationAlerts,
  getPublicationStatistics,
  getClaimStatistics,
  getCongressStatistics,
  getAlertStatistics,
  PUBLICATION_TYPE_LABELS,
  PUBLICATION_STATUS_LABELS,
  CLAIM_STATUS_LABELS,
} from '@/data/scientific-communications-data';
import {
  mslProfiles,
  mslActivities,
  fieldInsights,
  crossModuleAlerts,
  getMSLStatistics,
  getActivityStatistics,
  getInsightStatistics,
  getTerritoryMetrics,
  getInsightTrends,
  getAlertStatistics as getMSLAlertStatistics,
  getUpcomingFollowUps,
  getSignalRelatedInsights,
  ACTIVITY_TYPE_LABELS,
  OUTCOME_LABELS,
  INSIGHT_CATEGORY_LABELS,
  REGION_LABELS,
  type MSLActivityType,
  type InsightCategory,
  type TerritoryRegion,
} from '@/data/msl-activities-data';
import {
  reviewItems,
  reviewQueues,
  getReviewMetrics,
  getReviewsByStatus,
  getOverdueReviews,
  getSignalRelatedReviews,
  getCriticalReviews,
  getReviewQueueStats,
  getReviewTypeDistribution,
  REVIEW_TYPE_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEWER_ROLE_LABELS,
  COMMENT_TYPE_LABELS,
  type ReviewItem,
  type ReviewStatus,
  type ReviewerRole,
} from '@/data/medical-review-data';
import {
  medAffairsKPIs,
  kolAnalyticsData,
  mslPerformanceData,
  publicationAnalyticsData,
  reviewAnalyticsData,
  crossModuleInsightsData,
  getAnalyticsDashboard,
  getKPIsByCategory,
  getKPIsAboveTarget,
  getKPIsBelowTarget,
  getTerritoryRankings,
  getReviewBottlenecks,
  getCrossModuleAlertCount,
  getPublicationImpactScore,
  getMSLProductivityIndex,
  type KPIMetric,
} from '@/data/medical-affairs-analytics-data';
import { useProductFilter } from '@/hooks/useProductFilter';

// ============================================================================
// TYPES
// ============================================================================

type MedAffairsView = 
  | 'dashboard'
  | 'kol-management'
  | 'msl-activities'
  | 'publications'
  | 'advisory-boards'
  | 'congresses'
  | 'medical-info'
  | 'grants-iir'
  | 'medical-review'
  | 'analytics';

type KOLTier = 'tier-1' | 'tier-2' | 'tier-3' | 'emerging';
type PublicationStatus = 'concept' | 'drafting' | 'review' | 'submitted' | 'published';

interface KOL {
  id: string;
  name: string;
  credentials: string;
  title: string;
  institution: string;
  location: string;
  tier: KOLTier;
  specialty: string;
  engagementScore: number;
  publications: number;
  interactions: number;
  lastInteraction?: string;
  assignedMSL: string;
  products: string[];
  status: 'active' | 'engaged' | 'prospect';
}

interface MSLActivity {
  id: string;
  mslName: string;
  kolName: string;
  kolTier: KOLTier;
  date: string;
  type: string;
  product: string;
  outcome: string;
  insights: string[];
  followUp: boolean;
}

interface Publication {
  id: string;
  title: string;
  type: 'primary' | 'abstract' | 'poster' | 'review';
  status: PublicationStatus;
  product: string;
  study?: string;
  leadAuthor: string;
  targetJournal?: string;
  targetCongress?: string;
  targetDate: string;
  daysToTarget: number;
  onTrack: boolean;
}

interface AdvisoryBoard {
  id: string;
  name: string;
  type: 'scientific' | 'clinical' | 'patient';
  date: string;
  status: 'planning' | 'confirmed' | 'completed';
  product: string;
  participantCount: number;
  format: 'in-person' | 'virtual' | 'hybrid';
  objectives: string[];
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_KOLS: KOL[] = [
  {
    id: 'kol-001',
    name: 'Dr. Sarah Chen',
    credentials: 'MD, PhD, FACP',
    title: 'Professor of Oncology',
    institution: 'Memorial Sloan Kettering Cancer Center',
    location: 'New York, NY',
    tier: 'tier-1',
    specialty: 'Breast Cancer',
    engagementScore: 94,
    publications: 187,
    interactions: 24,
    lastInteraction: '2025-12-28',
    assignedMSL: 'Dr. Michael Torres',
    products: ['Nexavant', 'Velorix'],
    status: 'active',
  },
  {
    id: 'kol-002',
    name: 'Dr. James Mitchell',
    credentials: 'MD, MPH',
    title: 'Chief of Hematology',
    institution: 'MD Anderson Cancer Center',
    location: 'Houston, TX',
    tier: 'tier-1',
    specialty: 'Hematologic Malignancies',
    engagementScore: 91,
    publications: 156,
    interactions: 18,
    lastInteraction: '2025-12-22',
    assignedMSL: 'Dr. Lisa Park',
    products: ['Nexavant'],
    status: 'active',
  },
  {
    id: 'kol-003',
    name: 'Dr. Maria Gonzalez',
    credentials: 'MD, PhD',
    title: 'Director of Clinical Research',
    institution: 'Dana-Farber Cancer Institute',
    location: 'Boston, MA',
    tier: 'tier-2',
    specialty: 'Lung Cancer',
    engagementScore: 82,
    publications: 98,
    interactions: 12,
    lastInteraction: '2025-12-15',
    assignedMSL: 'Dr. Michael Torres',
    products: ['Nexavant', 'CerebraClear'],
    status: 'engaged',
  },
  {
    id: 'kol-004',
    name: 'Dr. Robert Kim',
    credentials: 'MD',
    title: 'Associate Professor',
    institution: 'Stanford Cancer Center',
    location: 'Palo Alto, CA',
    tier: 'tier-2',
    specialty: 'GI Oncology',
    engagementScore: 78,
    publications: 67,
    interactions: 8,
    lastInteraction: '2025-12-10',
    assignedMSL: 'Dr. Jennifer Walsh',
    products: ['Velorix'],
    status: 'engaged',
  },
  {
    id: 'kol-005',
    name: 'Dr. Emily Watson',
    credentials: 'MD, FASCO',
    title: 'Community Oncologist',
    institution: 'Oncology Associates of Oregon',
    location: 'Portland, OR',
    tier: 'tier-3',
    specialty: 'General Oncology',
    engagementScore: 65,
    publications: 12,
    interactions: 4,
    lastInteraction: '2025-11-28',
    assignedMSL: 'Dr. Jennifer Walsh',
    products: ['Nexavant'],
    status: 'prospect',
  },
  {
    id: 'kol-006',
    name: 'Dr. Aisha Patel',
    credentials: 'MD, PhD',
    title: 'Clinical Fellow',
    institution: 'Johns Hopkins',
    location: 'Baltimore, MD',
    tier: 'emerging',
    specialty: 'Immuno-Oncology',
    engagementScore: 58,
    publications: 8,
    interactions: 2,
    assignedMSL: 'Dr. Lisa Park',
    products: ['Nexavant'],
    status: 'prospect',
  },
];

const MOCK_MSL_ACTIVITIES: MSLActivity[] = [
  {
    id: 'act-001',
    mslName: 'Dr. Michael Torres',
    kolName: 'Dr. Sarah Chen',
    kolTier: 'tier-1',
    date: '2025-12-28',
    type: 'Scientific Exchange',
    product: 'Nexavant',
    outcome: 'Insight Gained',
    insights: ['Interest in combination therapy data', 'Upcoming trial enrollment concerns'],
    followUp: true,
  },
  {
    id: 'act-002',
    mslName: 'Dr. Lisa Park',
    kolName: 'Dr. James Mitchell',
    kolTier: 'tier-1',
    date: '2025-12-27',
    type: 'Congress Meeting',
    product: 'Nexavant',
    outcome: 'Data Presentation',
    insights: ['Positive reception to OS data', 'Request for subgroup analysis'],
    followUp: true,
  },
  {
    id: 'act-003',
    mslName: 'Dr. Michael Torres',
    kolName: 'Dr. Maria Gonzalez',
    kolTier: 'tier-2',
    date: '2025-12-26',
    type: 'Publication Discussion',
    product: 'CerebraClear',
    outcome: 'Collaboration Discussed',
    insights: ['Interested in co-authorship opportunity'],
    followUp: false,
  },
  {
    id: 'act-004',
    mslName: 'Dr. Jennifer Walsh',
    kolName: 'Dr. Robert Kim',
    kolTier: 'tier-2',
    date: '2025-12-25',
    type: 'Investigator Meeting',
    product: 'Velorix',
    outcome: 'Follow-up Needed',
    insights: ['Site activation delays', 'Additional training needed'],
    followUp: true,
  },
];

const MOCK_PUBLICATIONS: Publication[] = [
  {
    id: 'pub-001',
    title: 'LIG-2847-301: Overall Survival Analysis in Advanced Solid Tumors',
    type: 'primary',
    status: 'review',
    product: 'Nexavant (LIG-2847)',
    study: 'LIG-2847-301',
    leadAuthor: 'Dr. Sarah Chen',
    targetJournal: 'New England Journal of Medicine',
    targetDate: '2026-03-15',
    daysToTarget: 75,
    onTrack: true,
  },
  {
    id: 'pub-002',
    title: 'Biomarker-Driven Response Patterns in LIG-2847 Treated Patients',
    type: 'abstract',
    status: 'submitted',
    product: 'Nexavant (LIG-2847)',
    study: 'LIG-2847-301',
    leadAuthor: 'Dr. James Mitchell',
    targetCongress: 'ASCO 2026',
    targetDate: '2026-02-01',
    daysToTarget: 33,
    onTrack: true,
  },
  {
    id: 'pub-003',
    title: 'Safety Profile of VLX-990 in Refractory Lymphoma: Pooled Analysis',
    type: 'primary',
    status: 'drafting',
    product: 'Velorix (VLX-990)',
    study: 'VLX-990-201',
    leadAuthor: 'Dr. Robert Kim',
    targetJournal: 'Blood',
    targetDate: '2026-06-01',
    daysToTarget: 153,
    onTrack: true,
  },
  {
    id: 'pub-004',
    title: 'Real-World Evidence: Nexavant Outcomes in Community Practice',
    type: 'review',
    status: 'concept',
    product: 'Nexavant (LIG-2847)',
    leadAuthor: 'Dr. Emily Watson',
    targetJournal: 'Journal of Clinical Oncology',
    targetDate: '2026-09-01',
    daysToTarget: 245,
    onTrack: true,
  },
  {
    id: 'pub-005',
    title: 'CNS-303 Interim Analysis: Efficacy in Alzheimers Disease',
    type: 'primary',
    status: 'drafting',
    product: 'CerebraClear (CNS-303)',
    study: 'CNS-303-201',
    leadAuthor: 'Dr. Maria Gonzalez',
    targetJournal: 'The Lancet Neurology',
    targetDate: '2026-04-15',
    daysToTarget: 106,
    onTrack: false,
  },
];

const MOCK_ADVISORY_BOARDS: AdvisoryBoard[] = [
  {
    id: 'ab-001',
    name: 'Nexavant Phase 4 Strategy Advisory Board',
    type: 'scientific',
    date: '2026-01-28',
    status: 'confirmed',
    product: 'Nexavant',
    participantCount: 12,
    format: 'hybrid',
    objectives: ['Discuss Phase 4 study design', 'Review RWE strategy', 'Biomarker development priorities'],
  },
  {
    id: 'ab-002',
    name: 'Velorix Pediatric Development Summit',
    type: 'clinical',
    date: '2026-02-15',
    status: 'planning',
    product: 'Velorix',
    participantCount: 8,
    format: 'virtual',
    objectives: ['Pediatric dosing considerations', 'Trial design for rare pediatric indications'],
  },
  {
    id: 'ab-003',
    name: 'CerebraClear Patient Experience Forum',
    type: 'patient',
    date: '2026-03-10',
    status: 'planning',
    product: 'CerebraClear',
    participantCount: 15,
    format: 'in-person',
    objectives: ['Understand patient journey', 'Caregiver needs assessment', 'Support program design'],
  },
];

const TIER_COLORS: Record<KOLTier, BadgeColor> = {
  'tier-1': 'purple',
  'tier-2': 'blue',
  'tier-3': 'gray',
  'emerging': 'green',
};

const STATUS_COLORS: Record<PublicationStatus, BadgeColor> = {
  concept: 'gray',
  drafting: 'blue',
  review: 'amber',
  submitted: 'purple',
  published: 'green',
};

// ============================================================================
// COMPONENT
// ============================================================================

// v0.21.9: Modal types for all Medical Affairs actions
type MedAffairsModalType = 
  | 'add-kol' | 'edit-kol' | 'log-kol-interaction' | 'email-kol'
  | 'add-msl' | 'view-msl-activities' | 'view-msl-insights' | 'view-msl-performance' | 'log-msl-activity'
  | 'schedule-followup' | 'add-insight'
  | 'view-safety-alert' | 'brief-field-team'
  | 'filter-publications' | 'create-publication' | 'view-publication'
  | 'search-claims' | 'create-claim' | 'view-claim'
  | 'add-congress' | 'manage-congress'
  | 'refresh-alerts' | 'acknowledge-alert' | 'resolve-alert'
  | 'plan-advisory-board' | 'view-advisory-board' | 'add-congress-calendar'
  | 'filter-inquiries' | 'create-inquiry' | 'filter-responses' | 'create-response' | 'view-response'
  | 'navigate-safety' | 'open-response' | 'open-inquiry'
  | 'create-grant' | 'view-grant'
  | 'filter-reviews' | 'create-submission' | 'view-review-item';

interface MedAffairsModalState {
  type: MedAffairsModalType | null;
  data?: Record<string, unknown>;
}

interface MedicalAffairsScreenProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function MedicalAffairsScreen({ filters: _filters }: MedicalAffairsScreenProps) {
  const [activeView, setActiveView] = useState<MedAffairsView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKOL, setSelectedKOL] = useState<KOL | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [tierFilter, setTierFilter] = useState<KOLTier | 'all'>('all');
  const { filterByProductsArray, filterByProductName, isFiltered, selectedProduct, matchesProductName } = useProductFilter();
  
  // v0.21.9: Modal state and toast for all actions
  const [modal, setModal] = useState<MedAffairsModalState>({ type: null });
  const toast = useToast();
  
  const openModal = (type: MedAffairsModalType, data?: Record<string, unknown>) => {
    setModal({ type, data });
  };
  
  const closeModal = () => setModal({ type: null });
  
  const filteredKOLs = useMemo(() => {
    return MOCK_KOLS.filter(kol => {
      const matchesSearch = searchQuery === '' || 
        kol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kol.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || kol.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [searchQuery, tierFilter]);

  // ============================================================================
  // DASHBOARD VIEW
  // ============================================================================

  const renderDashboard = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total KOLs" value="247" trend={{ value: 12, direction: 'up', label: 'new this quarter' }} icon={<Users className="w-5 h-5" />} />
        <StatCard title="MSL Interactions (YTD)" value="1,847" trend={{ value: 23, direction: 'up', label: 'vs last year' }} icon={<Briefcase className="w-5 h-5" />} />
        <StatCard title="Publications" value="34" subtitle="12 in pipeline" icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="Advisory Boards" value="8" subtitle="3 upcoming" icon={<Calendar className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">KOL Engagement by Tier</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('kol-management')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { tier: 'Tier 1', count: 42, engaged: 38, color: 'bg-accent-purple' },
                { tier: 'Tier 2', count: 87, engaged: 62, color: 'bg-accent-blue' },
                { tier: 'Tier 3', count: 98, engaged: 45, color: 'bg-slate-400' },
                { tier: 'Emerging', count: 20, engaged: 8, color: 'bg-accent-green' },
              ].map(tier => (
                <div key={tier.tier} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{tier.tier}</span>
                    <span className="text-text-muted">{tier.engaged}/{tier.count} engaged ({Math.round(tier.engaged/tier.count*100)}%)</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${tier?.color ?? ''} rounded-full`} style={{ width: `${tier.engaged/tier.count*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Recent MSL Activities</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('msl-activities')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_MSL_ACTIVITIES.slice(0, 4).map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-elevated transition-colors">
                  <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-accent-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">{activity.kolName}</span>
                      <Badge color={TIER_COLORS[activity.kolTier]} size="sm">{activity.kolTier.replace('-', ' ')}</Badge>
                    </div>
                    <div className="text-sm text-text-secondary">{activity.type} • {activity.product}</div>
                    <div className="text-xs text-text-muted mt-1">{activity.mslName} • {activity.date}</div>
                  </div>
                  {activity.followUp && <Badge color="amber" size="sm">Follow-up</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Publication Pipeline</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('publications')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_PUBLICATIONS.slice(0, 4).map(pub => (
                <div key={pub.id} className="flex items-start justify-between p-3 rounded-lg border border-border hover:border-accent-blue/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={STATUS_COLORS[pub.status]} size="sm">{pub.status}</Badge>
                      <Badge color="gray" size="sm">{pub.type}</Badge>
                    </div>
                    <div className="font-medium text-text-primary text-sm truncate">{pub.title}</div>
                    <div className="text-xs text-text-muted mt-1">{pub.leadAuthor} • {pub.targetJournal || pub.targetCongress}</div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className={`text-sm font-medium ${pub.onTrack ? 'text-green-600' : 'text-red-600'}`}>{pub.daysToTarget}d</div>
                    <div className="text-xs text-text-muted">to target</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">Upcoming Advisory Boards</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveView('advisory-boards')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOCK_ADVISORY_BOARDS.map(ab => (
                <div key={ab.id} className="p-4 rounded-lg border border-border hover:border-accent-purple/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <Badge color={ab.type === 'scientific' ? 'purple' : ab.type === 'clinical' ? 'blue' : 'green'} size="sm">{ab.type}</Badge>
                    <Badge color={ab.status === 'confirmed' ? 'green' : 'amber'} size="sm">{ab.status}</Badge>
                  </div>
                  <div className="font-medium text-text-primary">{ab.name}</div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{ab.date}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{ab.participantCount}</span>
                    <span className="flex items-center gap-1"><Globe className="w-4 h-4" />{ab.format}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Recent Insights</h3>
            <Badge color="purple" size="sm">12 new this week</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'Clinical', title: 'Interest in combination therapy with checkpoint inhibitors', source: 'Dr. Sarah Chen', date: '2025-12-28', priority: 'high', product: 'Nexavant' },
              { type: 'Competitive', title: 'Competitor X showing accelerated development in same indication', source: 'ASH 2025 Intelligence', date: '2025-12-20', priority: 'high', product: 'Velorix' },
              { type: 'Market Access', title: 'Payers requesting comparative effectiveness data', source: 'Dr. Robert Kim', date: '2025-12-15', priority: 'medium', product: 'Nexavant' },
            ].map((insight, i) => (
              <div key={i} className="p-4 rounded-lg bg-surface-elevated border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge color={insight.type === 'Clinical' ? 'blue' : insight.type === 'Competitive' ? 'red' : 'amber'} size="sm">{insight.type}</Badge>
                  <Badge color={insight.priority === 'high' ? 'red' : 'gray'} size="sm">{insight.priority}</Badge>
                </div>
                <p className="text-sm text-text-primary font-medium mb-2">{insight.title}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{insight.source}</span>
                  <span>{insight.date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // KOL MANAGEMENT VIEW
  // ============================================================================

  const renderKOLManagement = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" placeholder="Search KOLs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50" />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'tier-1', 'tier-2', 'tier-3', 'emerging'] as const).map(tier => (
            <button key={tier} onClick={() => setTierFilter(tier)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tierFilter === tier ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'}`}>
              {tier === 'all' ? 'All' : tier.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-text-muted hover:bg-surface-elevated'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-accent-blue text-white' : 'text-text-muted hover:bg-surface-elevated'}`}><LayoutGrid className="w-4 h-4" /></button>
          <Button variant="primary" size="sm" onClick={() => {
            openModal('add-kol');
          }}><Plus className="w-4 h-4 mr-1" /> Add KOL</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 bg-accent-purple/10 rounded-lg border border-accent-purple/20"><div className="text-2xl font-bold text-accent-purple">42</div><div className="text-sm text-text-secondary">Tier 1 KOLs</div></div>
        <div className="p-4 bg-accent-blue/10 rounded-lg border border-accent-blue/20"><div className="text-2xl font-bold text-accent-blue">87</div><div className="text-sm text-text-secondary">Tier 2 KOLs</div></div>
        <div className="p-4 bg-slate-500/10 rounded-lg border border-slate-500/20"><div className="text-2xl font-bold text-slate-500">98</div><div className="text-sm text-text-secondary">Tier 3 KOLs</div></div>
        <div className="p-4 bg-accent-green/10 rounded-lg border border-accent-green/20"><div className="text-2xl font-bold text-accent-green">20</div><div className="text-sm text-text-secondary">Emerging</div></div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-elevated border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">KOL</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Specialty</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Tier</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Engagement</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Publications</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Assigned MSL</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredKOLs.map(kol => (
                  <tr key={kol.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-white font-medium">{kol.name.split(' ').map(n => n[0]).join('')}</div>
                        <div><div className="font-medium text-text-primary">{kol.name}</div><div className="text-xs text-text-muted">{kol.credentials}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="text-sm text-text-primary">{kol.institution}</div><div className="text-xs text-text-muted flex items-center gap-1"><MapPin className="w-3 h-3" />{kol.location}</div></td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{kol.specialty}</td>
                    <td className="px-4 py-3 text-center"><Badge color={TIER_COLORS[kol.tier]} size="sm">{kol.tier.replace('-', ' ')}</Badge></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-surface-elevated rounded-full overflow-hidden"><div className={`h-full rounded-full ${kol.engagementScore >= 80 ? 'bg-green-500' : kol.engagementScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${kol.engagementScore}%` }} /></div>
                        <span className="text-sm font-medium text-text-primary">{kol.engagementScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-secondary">{kol.publications}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{kol.assignedMSL}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedKOL(kol)} className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-primary"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => { openModal('edit-kol'); toast.info(`Opening edit form for ${kol.name}`); }} className="p-1.5 rounded hover:bg-surface-card text-text-muted hover:text-text-primary"><Edit className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedKOL && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-surface-card border-l border-border shadow-xl z-50 overflow-y-auto">
          <div className="sticky top-0 bg-surface-card border-b border-border p-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">KOL Profile</h3>
            <button onClick={() => setSelectedKOL(null)} className="p-2 rounded-lg hover:bg-surface-elevated text-text-muted"><XCircle className="w-5 h-5" /></button>
          </div>
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-white text-xl font-medium">{selectedKOL.name.split(' ').map(n => n[0]).join('')}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-text-primary">{selectedKOL.name}</h2><Badge color={TIER_COLORS[selectedKOL.tier]} size="sm">{selectedKOL.tier.replace('-', ' ')}</Badge></div>
                <div className="text-text-secondary">{selectedKOL.credentials}</div>
                <div className="text-sm text-text-muted mt-1">{selectedKOL.title}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="p-3 bg-surface-elevated rounded-lg text-center"><div className="text-2xl font-bold text-accent-purple">{selectedKOL.engagementScore}</div><div className="text-xs text-text-muted">Engagement</div></div>
              <div className="p-3 bg-surface-elevated rounded-lg text-center"><div className="text-2xl font-bold text-accent-blue">{selectedKOL.publications}</div><div className="text-xs text-text-muted">Publications</div></div>
              <div className="p-3 bg-surface-elevated rounded-lg text-center"><div className="text-2xl font-bold text-accent-green">{selectedKOL.interactions}</div><div className="text-xs text-text-muted">Interactions</div></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm"><Building className="w-5 h-5 text-text-muted" /><div><div className="text-text-primary">{selectedKOL.institution}</div><div className="text-text-muted text-xs">{selectedKOL.location}</div></div></div>
              <div className="flex items-center gap-3 text-sm"><Stethoscope className="w-5 h-5 text-text-muted" /><div className="text-text-primary">{selectedKOL.specialty}</div></div>
              <div className="flex items-center gap-3 text-sm"><UserCircle className="w-5 h-5 text-text-muted" /><div className="text-text-primary">Assigned: {selectedKOL.assignedMSL}</div></div>
              <div className="flex items-center gap-3 text-sm"><Clock className="w-5 h-5 text-text-muted" /><div className="text-text-primary">Last: {selectedKOL.lastInteraction || 'None'}</div></div>
            </div>
            <div><h4 className="text-sm font-medium text-text-muted mb-2">Products</h4><div className="flex flex-wrap gap-2">{selectedKOL.products.map(p => <Badge key={p} color="blue" size="sm">{p}</Badge>)}</div></div>
            <div className="flex gap-2"><Button variant="primary" size="sm" className="flex-1" onClick={() => {
              openModal('log-kol-interaction', { kolName: selectedKOL.name, kolId: selectedKOL.id });
            }}><Plus className="w-4 h-4 mr-1" /> Log Interaction</Button><Button variant="outline" size="sm" className="flex-1" onClick={() => {
              openModal('email-kol', { kolName: selectedKOL.name, email: `${selectedKOL.name.toLowerCase().replace(' ', '.')}@example.com` });
            }}><Mail className="w-4 h-4 mr-1" /> Email</Button></div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // OTHER VIEWS (Simplified)
  // ============================================================================

  // ============================================================================
  // MSL ACTIVITIES & FIELD INSIGHTS CENTER - v0.5.2
  // ============================================================================
  
  const [mslTab, setMslTab] = useState<'team' | 'activities' | 'insights' | 'territories' | 'alerts'>('team');
  const [selectedMSL, setSelectedMSL] = useState<string | null>(null);
  const [mslInsightFilter, setMslInsightFilter] = useState<'all' | 'new' | 'signal-related' | 'actioned'>('all');
  
  // MSL Statistics
  const mslStats = useMemo(() => getMSLStatistics(), []);
  const activityStats = useMemo(() => getActivityStatistics(), []);
  const insightStats = useMemo(() => getInsightStatistics(), []);
  const territoryData = useMemo(() => getTerritoryMetrics(), []);
  const insightTrends = useMemo(() => getInsightTrends(), []);
  const mslAlertStats = useMemo(() => getMSLAlertStatistics(), []);
  const upcomingFollowUps = useMemo(() => getUpcomingFollowUps(), []);
  const signalInsights = useMemo(() => getSignalRelatedInsights(), []);
  
  const getActivityTypeColor = (type: MSLActivityType): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'scientific-exchange': 'blue',
      'congress-meeting': 'purple',
      'investigator-meeting': 'amber',
      'site-visit': 'gray',
      'advisory-board': 'purple',
      'speaker-program': 'green',
      'publication-discussion': 'blue',
      'data-presentation': 'green',
      'training': 'gray',
      'follow-up': 'amber',
    };
    return colors[type] || 'gray';
  };
  
  const getInsightPriorityColor = (priority: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'critical': 'red',
      'high': 'amber',
      'medium': 'blue',
      'low': 'gray',
    };
    return colors[priority] || 'gray';
  };
  
  const getInsightCategoryColor = (category: InsightCategory): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'safety-observation': 'red',
      'efficacy-feedback': 'green',
      'competitive-intel': 'purple',
      'unmet-need': 'amber',
      'study-interest': 'blue',
      'real-world-experience': 'green',
      'formulary-access': 'amber',
      'clinical-practice': 'blue',
      'patient-population': 'gray',
    };
    return colors[category] || 'gray';
  };

  const filteredInsights = useMemo(() => {
    let base = fieldInsights.filter(i =>
      !isFiltered || matchesProductName(i.productId) || matchesProductName(i.productName ?? '')
    );
    switch (mslInsightFilter) {
      case 'new':
        return base.filter(i => i.status === 'new');
      case 'signal-related':
        return base.filter(i => i.hasSignalRelevance);
      case 'actioned':
        return base.filter(i => i.status === 'actioned');
      default:
        return base;
    }
  }, [mslInsightFilter, isFiltered, matchesProductName]);

  const renderMSLTeam = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title="Active MSLs" value={String(mslStats.activeCount)} subtitle={`${mslStats.total} total`} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Total KOLs" value={String(mslStats.totalKOLs)} subtitle={`${mslStats.tier1KOLs} Tier 1`} icon={<UserCircle className="w-5 h-5" />} />
        <StatCard title="YTD Interactions" value={String(mslStats.ytdInteractions)} trend={{ value: 23, direction: 'up' as const, label: 'vs last year' }} icon={<Activity className="w-5 h-5" />} />
        <StatCard title="YTD Insights" value={String(mslStats.ytdInsights)} trend={{ value: 18, direction: 'up' as const, label: 'vs last year' }} icon={<Lightbulb className="w-5 h-5" />} />
        <StatCard title="Avg Coverage" value={`${mslStats.avgCoverage}%`} subtitle="Territory coverage" icon={<Target className="w-5 h-5" />} />
      </div>

      {/* MSL Team List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">MSL Team</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                const csvContent = [
                  ['Name', 'Credentials', 'Territory', 'Status', 'YTD Activities', 'YTD Insights', 'Coverage %'].join(','),
                  ...mslProfiles.map(m => [
                    m.name,
                    m.credentials,
                    m.territory,
                    m.status,
                    m.ytdInteractions,
                    m.ytdInsights,
                    m.coveragePercentage
                  ].join(','))
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `msl-team-${new Date().toISOString().split('T')[0]}.csv`;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}><Download className="w-4 h-4 mr-1" /> Export</Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal('add-msl');
              }}><Plus className="w-4 h-4 mr-1" /> Add MSL</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mslProfiles.map(msl => (
              <div 
                key={msl.id} 
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${selectedMSL === msl.id ? 'border-teal-500 bg-teal-500/5' : 'border-border hover:border-teal-300'}`}
                onClick={() => setSelectedMSL(selectedMSL === msl.id ? null : msl.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{msl.name}</span>
                        <span className="text-sm text-text-muted">{msl.credentials}</span>
                        <Badge color={msl.status === 'active' ? 'green' : 'gray'} size="sm">{msl.status}</Badge>
                      </div>
                      <div className="text-sm text-text-muted">{msl.title}</div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {msl.territory}</span>
                        <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {msl.assignedKOLCount} KOLs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <div className="text-lg font-bold text-teal-600">{msl.ytdInteractions}</div>
                      <div className="text-xs text-text-muted">Activities</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">{msl.ytdInsights}</div>
                      <div className="text-xs text-text-muted">Insights</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">{msl.coveragePercentage}%</div>
                      <div className="text-xs text-text-muted">Coverage</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= msl.performanceRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {selectedMSL === msl.id && (
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-text-muted">KOL Breakdown</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Tier 1</span><span className="font-medium">{msl.tier1KOLs}</span></div>
                        <div className="flex justify-between"><span>Tier 2</span><span className="font-medium">{msl.tier2KOLs}</span></div>
                        <div className="flex justify-between"><span>Tier 3</span><span className="font-medium">{msl.tier3KOLs}</span></div>
                        <div className="flex justify-between"><span>Emerging</span><span className="font-medium">{msl.emergingKOLs}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-text-muted">Primary Products</div>
                      <div className="flex flex-wrap gap-1">
                        {msl.primaryProducts.map(p => (
                          <Badge key={p} color="blue" size="sm">{p}</Badge>
                        ))}
                      </div>
                      <div className="text-xs font-medium text-text-muted mt-2">Therapeutic Areas</div>
                      <div className="flex flex-wrap gap-1">
                        {msl.therapeuticAreas.map(ta => (
                          <Badge key={ta} color="purple" size="sm">{ta}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-text-muted">Contact</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-text-muted" /><span className="text-text-primary">{msl.email}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-text-muted" /><span className="text-text-primary">{msl.phone}</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-text-muted">Quick Actions</div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => {
                          setMslTab('activities');
                          toast.info(`Viewing activities for ${msl.name}`);
                        }}><Activity className="w-3 h-3 mr-1" /> View Activities</Button>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => {
                          setMslTab('insights');
                          toast.info(`Viewing insights for ${msl.name}`);
                        }}><Lightbulb className="w-3 h-3 mr-1" /> View Insights</Button>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => {
                          openModal('view-msl-performance', { mslName: msl.name, mslId: msl.id });
                        }}><BarChart3 className="w-3 h-3 mr-1" /> Performance</Button>
                      </div>
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

  const renderMSLActivitiesList = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Activity Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Activities" value={String(activityStats.total)} subtitle="This period" icon={<Activity className="w-5 h-5" />} />
        <StatCard title="This Month" value={String(activityStats.thisMonth)} trend={{ value: 15, direction: 'up' as const, label: 'vs last month' }} icon={<Calendar className="w-5 h-5" />} />
        <StatCard title="Pending Follow-ups" value={String(activityStats.withFollowUp)} subtitle="Action required" icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Insights Captured" value={String(insightStats.total)} subtitle={`${insightStats.newCount} new`} icon={<Lightbulb className="w-5 h-5" />} />
      </div>

      {/* Upcoming Follow-ups Alert */}
      {upcomingFollowUps.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-300">Upcoming Follow-ups ({upcomingFollowUps.length})</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {upcomingFollowUps.slice(0, 3).map(fu => (
                  <div key={fu.id} className="text-sm bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full">
                    {fu.kolName} - {fu.followUpDate}
                  </div>
                ))}
                {upcomingFollowUps.length > 3 && (
                  <span className="text-sm text-amber-600">+{upcomingFollowUps.length - 3} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Recent Activities</h3>
            <Button variant="primary" size="sm" onClick={() => {
              openModal('log-msl-activity');
            }}><Plus className="w-4 h-4 mr-1" /> Log Activity</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mslActivities.map(activity => (
              <div key={activity.id} className="p-4 rounded-lg border border-border hover:border-teal-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{activity.kolName}</span>
                        <Badge color={TIER_COLORS[activity.kolTier]} size="sm">{activity.kolTier.replace('-', ' ')}</Badge>
                      </div>
                      <div className="text-sm text-text-muted">{activity.mslName} • {activity.kolInstitution}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-text-muted">{activity.date}</div>
                    <div className="text-xs text-text-muted">{activity.duration} min • {activity.format}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge color={getActivityTypeColor(activity.type)} size="sm">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                  <Badge color="purple" size="sm">{activity.productName}</Badge>
                  <Badge color="green" size="sm">{OUTCOME_LABELS[activity.outcome]}</Badge>
                  {activity.linkedStudyId && <Badge color="blue" size="sm"><Link2 className="w-3 h-3 mr-1" />{activity.linkedStudyId}</Badge>}
                </div>

                {activity.meetingObjective && (
                  <div className="text-sm text-text-secondary mb-3">
                    <span className="font-medium">Objective:</span> {activity.meetingObjective}
                  </div>
                )}

                {activity.discussionTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {activity.discussionTopics.map((topic, i) => (
                      <span key={i} className="text-xs bg-surface-elevated px-2 py-1 rounded-full text-text-muted">{topic}</span>
                    ))}
                  </div>
                )}

                {activity.insights.length > 0 && (
                  <div className="bg-surface-elevated p-3 rounded-lg mb-3">
                    <div className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Insights Captured ({activity.insights.length})
                    </div>
                    {activity.insights.map(insight => (
                      <div key={insight.id} className={`p-2 rounded border mb-2 last:mb-0 ${insight.hasSignalRelevance ? 'border-amber-300 bg-amber-500/5' : 'border-border'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color={getInsightPriorityColor(insight.priority)} size="sm">{insight.priority}</Badge>
                          <Badge color={getInsightCategoryColor(insight.category)} size="sm">{INSIGHT_CATEGORY_LABELS[insight.category]}</Badge>
                          {insight.hasSignalRelevance && <Badge color="red" size="sm"><AlertTriangle className="w-3 h-3 mr-1" />Signal Related</Badge>}
                        </div>
                        <div className="text-sm text-text-primary">{insight.title}</div>
                        {insight.verbatimQuote && (
                          <div className="text-xs italic text-text-muted mt-1 pl-2 border-l-2 border-teal-300">
                            &quot;{insight.verbatimQuote}&quot;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activity.followUpRequired && (
                  <div className="flex items-center justify-between mt-3 p-2 bg-amber-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>Follow-up required</span>
                      {activity.followUpDate && <span className="font-medium">by {activity.followUpDate}</span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      openModal('schedule-followup', { activityId: activity.id, kolName: activity.kolName });
                    }}>Schedule Follow-up</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMSLInsights = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Insight Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title="Total Insights" value={String(insightStats.total)} subtitle="YTD" icon={<Lightbulb className="w-5 h-5" />} />
        <StatCard title="New" value={String(insightStats.newCount)} subtitle="Pending review" icon={<CircleDot className="w-5 h-5" />} />
        <StatCard title="Critical/High" value={String(insightStats.criticalCount + insightStats.highCount)} subtitle="Priority items" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard title="Signal Related" value={String(insightStats.withSignalRelevance)} subtitle="Safety correlation" icon={<Shield className="w-5 h-5" />} />
        <StatCard title="Actioned" value={String(insightStats.actionedCount)} subtitle="Completed" icon={<CheckCircle className="w-5 h-5" />} />
      </div>

      {/* Signal Related Alert */}
      {signalInsights.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-300">Signal-Related Insights Require Review</h4>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {signalInsights.length} field insights correlate with active safety signals. These should be reviewed with Safety and incorporated into signal evaluation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insight Trends */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Insight Trends by Category</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {insightTrends.filter(t => t.currentCount > 0).map(trend => (
              <div key={trend.category} className="p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge color={getInsightCategoryColor(trend.category)} size="sm">{trend.categoryLabel}</Badge>
                  {trend.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                  {trend.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-2xl font-bold text-text-primary">{trend.currentCount}</div>
                <div className="text-xs text-text-muted">
                  {trend.trend === 'up' && <span className="text-green-600">↑ {trend.trendPercentage}% vs prior period</span>}
                  {trend.trend === 'down' && <span className="text-red-600">↓ {Math.abs(trend.trendPercentage)}% vs prior period</span>}
                  {trend.trend === 'stable' && <span>No change</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg w-fit">
        {[
          { id: 'all', label: 'All Insights', count: fieldInsights.length },
          { id: 'new', label: 'New', count: insightStats.newCount },
          { id: 'signal-related', label: 'Signal Related', count: insightStats.withSignalRelevance, alert: true },
          { id: 'actioned', label: 'Actioned', count: insightStats.actionedCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMslInsightFilter(tab.id as typeof mslInsightFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mslInsightFilter === tab.id ? 'bg-surface-card text-teal-600 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${tab.alert ? 'bg-red-500 text-white' : 'bg-surface-base text-text-muted'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Insights List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Field Insights</h3>
            <Button variant="primary" size="sm" onClick={() => {
              openModal('add-insight');
            }}><Plus className="w-4 h-4 mr-1" /> Add Insight</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredInsights.map(insight => (
              <div 
                key={insight.id} 
                className={`p-4 rounded-lg border transition-colors ${insight.hasSignalRelevance ? 'border-amber-300 bg-amber-500/5' : 'border-border hover:border-teal-300'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-text-muted">{insight.insightCode}</span>
                      <Badge color={getInsightPriorityColor(insight.priority)} size="sm">{insight.priority}</Badge>
                      <Badge color={getInsightCategoryColor(insight.category)} size="sm">{INSIGHT_CATEGORY_LABELS[insight.category]}</Badge>
                      {insight.hasSignalRelevance && (
                        <Badge color="red" size="sm"><AlertTriangle className="w-3 h-3 mr-1" />Signal Impact</Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary">{insight.title}</h4>
                  </div>
                  <Badge 
                    color={insight.status === 'new' ? 'blue' : insight.status === 'actioned' ? 'green' : 'amber'} 
                    size="sm"
                  >
                    {insight.status}
                  </Badge>
                </div>

                <p className="text-sm text-text-secondary mb-3">{insight.description}</p>

                {insight.verbatimQuote && (
                  <div className="text-sm italic text-text-muted mb-3 pl-3 border-l-2 border-teal-300">
                    &quot;{insight.verbatimQuote}&quot;
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-text-muted mb-3">
                  <span className="flex items-center gap-1"><UserCircle className="w-4 h-4" /> {insight.mslName}</span>
                  {insight.kolName && <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {insight.kolName}</span>}
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {insight.date}</span>
                  <span className="flex items-center gap-1"><Pill className="w-4 h-4" /> {insight.productName}</span>
                </div>

                {insight.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {insight.tags.map(tag => (
                      <span key={tag} className="text-xs bg-surface-elevated px-2 py-0.5 rounded-full text-text-muted">#{tag}</span>
                    ))}
                  </div>
                )}

                {insight.aggregatedCount > 1 && (
                  <div className="text-xs text-teal-600 mb-3 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Similar insight reported {insight.aggregatedCount} times across the field
                  </div>
                )}

                {insight.recommendedAction && (
                  <div className="p-3 bg-surface-elevated rounded-lg">
                    <div className="text-xs font-medium text-text-muted mb-1">Recommended Action</div>
                    <div className="text-sm text-text-primary">{insight.recommendedAction}</div>
                    {insight.actionTakenDate && (
                      <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Actioned {insight.actionTakenDate} by {insight.actionTakenBy}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMSLTerritories = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {territoryData.map(territory => (
          <Card key={territory.region} className="overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-teal-500/10 to-cyan-500/10">
              <h3 className="font-semibold text-text-primary">{territory.regionName}</h3>
              <div className="text-sm text-text-muted">{territory.mslCount} MSL{territory.mslCount !== 1 ? 's' : ''}</div>
            </div>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total KOLs</span>
                  <span className="font-medium">{territory.totalKOLs}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">YTD Activities</span>
                  <span className="font-medium">{territory.ytdActivities}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">YTD Insights</span>
                  <span className="font-medium">{territory.ytdInsights}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Engagement</span>
                  <span className="font-medium">{territory.avgEngagementScore}%</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs font-medium text-text-muted mb-2">Coverage</div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ width: `${territory.avgEngagementScore}%` }} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Territory Details</h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-muted">Region</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">MSLs</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">Total KOLs</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">Tier 1 %</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">Tier 2 %</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">YTD Activities</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">YTD Insights</th>
                  <th className="text-center py-3 px-4 font-medium text-text-muted">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {territoryData.map(territory => (
                  <tr key={territory.region} className="border-b border-border hover:bg-surface-elevated">
                    <td className="py-3 px-4 font-medium">{territory.regionName}</td>
                    <td className="py-3 px-4 text-center">{territory.mslCount}</td>
                    <td className="py-3 px-4 text-center">{territory.totalKOLs}</td>
                    <td className="py-3 px-4 text-center">{territory.tier1Coverage}%</td>
                    <td className="py-3 px-4 text-center">{territory.tier2Coverage}%</td>
                    <td className="py-3 px-4 text-center">{territory.ytdActivities}</td>
                    <td className="py-3 px-4 text-center">{territory.ytdInsights}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-surface-base rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 rounded-full" 
                            style={{ width: `${territory.avgEngagementScore}%` }} 
                          />
                        </div>
                        <span className="text-xs">{territory.avgEngagementScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMSLAlerts = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Alert Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Alerts" value={String(mslAlertStats.total)} icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Critical" value={String(mslAlertStats.criticalCount)} subtitle="Immediate action" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard title="New" value={String(mslAlertStats.newCount)} subtitle="Pending review" icon={<CircleDot className="w-5 h-5" />} />
        <StatCard title="Field Briefed" value={String(mslAlertStats.fieldBriefed)} subtitle="Team informed" icon={<CheckCircle className="w-5 h-5" />} />
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Cross-Module Alerts</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {crossModuleAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical' ? 'border-red-300 bg-red-500/5' :
                  alert.severity === 'warning' ? 'border-amber-300 bg-amber-500/5' :
                  'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.severity === 'critical' ? 'bg-red-500/20' :
                      alert.severity === 'warning' ? 'bg-amber-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      {alert.type === 'safety-signal' && <Shield className={`w-5 h-5 ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`} />}
                      {alert.type === 'clinical-update' && <FlaskConical className="w-5 h-5 text-blue-600" />}
                      {alert.type === 'competitive-event' && <Target className="w-5 h-5 text-purple-600" />}
                      {alert.type === 'label-change' && <FileText className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          color={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'} 
                          size="sm"
                        >
                          {alert.severity}
                        </Badge>
                        <Badge color="purple" size="sm">{alert.type.replace(/-/g, ' ')}</Badge>
                        <Badge 
                          color={alert.status === 'field-briefed' ? 'green' : alert.status === 'acknowledged' ? 'amber' : 'blue'} 
                          size="sm"
                        >
                          {alert.status.replace(/-/g, ' ')}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-text-primary">{alert.title}</h4>
                    </div>
                  </div>
                  <div className="text-sm text-text-muted">{alert.detectedDate}</div>
                </div>

                <p className="text-sm text-text-secondary mb-3">{alert.description}</p>

                <div className="flex items-center gap-4 text-sm text-text-muted mb-3">
                  <span className="flex items-center gap-1"><Database className="w-4 h-4" /> Source: {alert.sourceModule}</span>
                  <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> Ref: {alert.sourceReference}</span>
                </div>

                <div className="p-3 bg-surface-elevated rounded-lg mb-3">
                  <div className="text-xs font-medium text-text-muted mb-1">Recommended Field Action</div>
                  <div className="text-sm text-text-primary">{alert.recommendedFieldAction}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{alert.relevantTerritories.map(r => REGION_LABELS[r]).join(', ')}</span>
                    <span>{alert.relevantMSLIds.length} MSLs affected</span>
                    {alert.linkedInsightIds.length > 0 && (
                      <span className="flex items-center gap-1 text-teal-600">
                        <Lightbulb className="w-3 h-3" />
                        {alert.linkedInsightIds.length} related insights
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      openModal('view-safety-alert', { alertId: alert.id, title: alert.title });
                    }}>View Details</Button>
                    {alert.status !== 'field-briefed' && (
                      <Button variant="primary" size="sm" onClick={() => {
                        openModal('brief-field-team', { alertId: alert.id, title: alert.title });
                      }}>Brief Field Team</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* R&D Connected Callout */}
      <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 dark:text-teal-300">R&D Connected</h3>
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
              Safety signals automatically surface to the field team. When Safety detects a signal, MSLs are briefed instantly.
              Field insights feed back to Safety for signal evaluation. That&apos;s not just communication — that&apos;s R&D Connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMSLActivities = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg w-fit">
        {[
          { id: 'team', label: 'MSL Team', icon: <Users className="w-4 h-4" />, count: mslStats.activeCount },
          { id: 'activities', label: 'Activities', icon: <Activity className="w-4 h-4" />, count: activityStats.thisMonth },
          { id: 'insights', label: 'Field Insights', icon: <Lightbulb className="w-4 h-4" />, count: insightStats.newCount, alert: signalInsights.length > 0 },
          { id: 'territories', label: 'Territories', icon: <MapPin className="w-4 h-4" /> },
          { id: 'alerts', label: 'Cross-Module Alerts', icon: <AlertCircle className="w-4 h-4" />, count: mslAlertStats.criticalCount + mslAlertStats.warningCount, alert: mslAlertStats.criticalCount > 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMslTab(tab.id as typeof mslTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mslTab === tab.id ? 'bg-surface-card text-teal-600 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${tab.alert ? 'bg-amber-500 text-white' : 'bg-surface-base text-text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {mslTab === 'team' && renderMSLTeam()}
      {mslTab === 'activities' && renderMSLActivitiesList()}
      {mslTab === 'insights' && renderMSLInsights()}
      {mslTab === 'territories' && renderMSLTerritories()}
      {mslTab === 'alerts' && renderMSLAlerts()}
    </div>
  );

  // ============================================================================
  // SCIENTIFIC COMMUNICATIONS CENTER - v0.5.1
  // ============================================================================
  
  const [sciCommTab, setSciCommTab] = useState<'pipeline' | 'platform' | 'congresses' | 'data-integration'>('pipeline');
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  
  // Statistics
  const pubStats = useMemo(() => getPublicationStatistics(), []);
  const claimStats = useMemo(() => getClaimStatistics(), []);
  const congressStats = useMemo(() => getCongressStatistics(), []);
  const alertStats = useMemo(() => getAlertStatistics(), []);
  
  const getPublicationStatusColor = (status: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'concept': 'gray',
      'protocol': 'gray',
      'drafting': 'blue',
      'internal-review': 'amber',
      'external-review': 'purple',
      'submitted': 'purple',
      'revision': 'amber',
      'accepted': 'green',
      'published': 'green',
    };
    return colors[status] || 'gray';
  };
  
  const getClaimStatusColor = (status: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'approved': 'green',
      'pending-approval': 'amber',
      'under-review': 'blue',
      'retired': 'gray',
      'draft': 'gray',
    };
    return colors[status] || 'gray';
  };

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'text-red-600';
    if (level === 'medium') return 'text-amber-600';
    return 'text-green-600';
  };

  const renderSciCommPipeline = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Signal Impact Alert Banner */}
      {pubStats.withSignalImpact > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-700 dark:text-amber-300">Safety Signal Impact Detected</h4>
            <p className="text-sm text-amber-600 dark:text-amber-400">{pubStats.withSignalImpact} publication(s) may be affected by active safety signals. Review required before proceeding.</p>
          </div>
        </div>
      )}

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Publication Pipeline</h3>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6 px-4">
            {[
              { stage: 'Concept', count: pubStats.statusCounts.concept, color: 'bg-gray-400' },
              { stage: 'Drafting', count: pubStats.statusCounts.drafting, color: 'bg-blue-500' },
              { stage: 'Internal Review', count: pubStats.statusCounts['internal-review'], color: 'bg-amber-500' },
              { stage: 'External Review', count: pubStats.statusCounts['external-review'], color: 'bg-purple-400' },
              { stage: 'Submitted', count: pubStats.statusCounts.submitted, color: 'bg-purple-600' },
              { stage: 'Published', count: pubStats.statusCounts.published + pubStats.statusCounts.accepted, color: 'bg-green-500' },
            ].map((stage, i, arr) => (
              <div key={stage.stage} className="flex-1 text-center relative">
                <div className={`w-12 h-12 mx-auto rounded-full ${stage?.color ?? ''} flex items-center justify-center text-white font-bold`}>
                  {stage.count}
                </div>
                <div className="text-xs text-text-secondary mt-2">{stage.stage}</div>
                {i < arr.length - 1 && <ChevronRight className="absolute top-4 -right-1 w-5 h-5 text-text-muted" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Publications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Active Publications</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                openModal('filter-publications');
              }}><Filter className="w-4 h-4 mr-1" /> Filter</Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal('create-publication');
              }}><Plus className="w-4 h-4 mr-1" /> New Publication</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {sciPublications.map(pub => (
              <div key={pub.id} className={`p-4 hover:bg-surface-elevated/50 transition-colors ${pub.hasSignalImpact ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge color={getPublicationStatusColor(pub.status)} size="sm">
                        {PUBLICATION_STATUS_LABELS[pub.status]}
                      </Badge>
                      <Badge color="gray" size="sm">{PUBLICATION_TYPE_LABELS[pub.type]}</Badge>
                      <Badge color="blue" size="sm">{pub.productName}</Badge>
                      {pub.priority === 'critical' && <Badge color="red" size="sm">Critical Priority</Badge>}
                      {pub.hasSignalImpact && (
                        <Badge color="amber" size="sm" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Signal Impact
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary mb-1">{pub.shortTitle}</h4>
                    <p className="text-sm text-text-muted line-clamp-1 mb-2">{pub.title}</p>
                    <div className="flex items-center gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1"><UserCircle className="w-4 h-4" />{pub.leadAuthor}</span>
                      <span className="flex items-center gap-1"><Target className="w-4 h-4" />{pub.targetJournal || pub.targetCongress}</span>
                      {pub.studyName && <span className="flex items-center gap-1"><FlaskConical className="w-4 h-4" />{pub.studyName}</span>}
                    </div>
                    {pub.riskReason && (
                      <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {pub.riskReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className={`text-lg font-bold ${pub.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                      {pub.daysToTarget > 0 ? pub.daysToTarget : 'Submitted'}
                    </div>
                    <div className="text-xs text-text-muted">{pub.daysToTarget > 0 ? 'days to target' : ''}</div>
                    <div className={`mt-2 px-2 py-0.5 rounded text-xs font-medium ${pub.riskLevel === 'high' ? 'bg-red-100 text-red-700' : pub.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {pub.riskLevel === 'low' ? 'On Track' : pub.riskLevel === 'medium' ? 'Monitor' : 'At Risk'}
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
                      openModal('view-publication', { pubId: pub.id, title: pub.shortTitle });
                    }}><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
                
                {/* Data Sources */}
                {pub.dataSources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5" /> Data Sources
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {pub.dataSources.map(ds => (
                        <div key={ds.id} className="flex items-center gap-1 text-xs px-2 py-1 bg-surface-elevated rounded">
                          <span className={`w-2 h-2 rounded-full ${ds.status === 'final' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {ds.name}
                          {ds.moduleLink && <ExternalLink className="w-3 h-3 text-text-muted" />}
                        </div>
                      ))}
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

  const renderSciCommPlatform = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Claims requiring review alert */}
      {claimStats.requiresReview > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-700 dark:text-amber-300">Claims Under Review</h4>
            <p className="text-sm text-amber-600 dark:text-amber-400">{claimStats.requiresReview} scientific claim(s) require review due to safety signals or data updates.</p>
          </div>
        </div>
      )}

      {/* Claims Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title="Total Claims" value={String(claimStats.total)} icon={<FileCheck className="w-5 h-5" />} />
        <StatCard title="Approved" value={String(claimStats.approved)} subtitle="Ready to use" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Pending Approval" value={String(claimStats.pending)} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Under Review" value={String(claimStats.underReview)} subtitle="Signal impact" icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Total Usage" value={String(claimStats.totalUsage)} subtitle="Across materials" icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* Claims Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Scientific Claims Library</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                openModal('search-claims');
              }}><Search className="w-4 h-4 mr-1" /> Search</Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal('create-claim');
              }}><Plus className="w-4 h-4 mr-1" /> New Claim</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {scientificClaims.map(claim => (
              <div key={claim.id} className={`p-4 hover:bg-surface-elevated/50 transition-colors ${claim.requiresReview ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono text-text-muted">{claim.claimCode}</span>
                      <Badge color={getClaimStatusColor(claim.status)} size="sm">
                        {CLAIM_STATUS_LABELS[claim.status]}
                      </Badge>
                      <Badge color="blue" size="sm">{claim.category}</Badge>
                      {claim.requiresReview && (
                        <Badge color="amber" size="sm" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Review Required
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary mb-1">{claim.shortDescription}</h4>
                    <p className="text-sm text-text-secondary mb-2 line-clamp-2">{claim.claimText}</p>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Pill className="w-3.5 h-3.5" />{claim.productName}</span>
                      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" />{claim.indication}</span>
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{claim.approvedRegions.join(', ') || 'Pending'}</span>
                    </div>
                    {claim.reviewReason && (
                      <div className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> {claim.reviewReason}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-text-primary">{claim.usageCount}</div>
                    <div className="text-xs text-text-muted">uses</div>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
                      openModal('view-claim', { claimId: claim.id, claimCode: claim.claimCode });
                    }}><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
                
                {/* Supporting Studies */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex flex-wrap gap-2">
                    {claim.supportingStudies.map(study => (
                      <div key={study} className="flex items-center gap-1 text-xs px-2 py-1 bg-surface-elevated rounded">
                        <FlaskConical className="w-3 h-3" /> {study}
                      </div>
                    ))}
                    {claim.supportingPublications.map(pubId => (
                      <div key={pubId} className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        <BookOpen className="w-3 h-3" /> {sciPublications.find(p => p.id === pubId)?.shortTitle || pubId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSciCommCongresses = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Upcoming deadlines banner */}
      {congressStats.nextCongress && (
        <div className="p-4 bg-purple-500/10 border border-purple-300 rounded-lg flex items-start gap-3">
          <Calendar className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-700 dark:text-purple-300">Upcoming: {congressStats.nextCongress.abbreviation}</h4>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Abstract deadline: {new Date(congressStats.nextCongress.abstractDeadline).toLocaleDateString()}
              {congressStats.pendingSubmissions > 0 && ` • ${congressStats.pendingSubmissions} draft submission(s) pending`}
            </p>
          </div>
        </div>
      )}

      {/* Congress Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Upcoming Congresses" value={String(congressStats.upcoming)} icon={<Calendar className="w-5 h-5" />} />
        <StatCard title="Total Submissions" value={String(congressStats.totalSubmissions)} subtitle="Planned" icon={<Presentation className="w-5 h-5" />} />
        <StatCard title="Pending Drafts" value={String(congressStats.pendingSubmissions)} icon={<FileText className="w-5 h-5" />} />
        <StatCard title="Congress Calendar" value="2026" icon={<BarChart3 className="w-5 h-5" />} />
      </div>

      {/* Congress List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Congress Planning</h3>
            <Button variant="primary" size="sm" onClick={() => {
              openModal('add-congress');
            }}><Plus className="w-4 h-4 mr-1" /> Add Congress</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sciCongresses.map(congress => (
              <div key={congress.id} className="p-4 rounded-lg border border-border hover:border-purple-300/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={congress.type === 'major' ? 'purple' : congress.type === 'specialty' ? 'blue' : 'gray'} size="sm">
                        {congress.type}
                      </Badge>
                      <Badge color={congress.status === 'planning' ? 'amber' : 'green'} size="sm">{congress.status}</Badge>
                    </div>
                    <h4 className="font-semibold text-text-primary text-lg">{congress.abbreviation}</h4>
                    <p className="text-sm text-text-muted">{congress.name}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    openModal('manage-congress', { congressId: congress.id, name: congress.abbreviation });
                  }}><Eye className="w-4 h-4 mr-1" /> Manage</Button>
                </div>
                
                <div className="flex items-center gap-6 text-sm text-text-muted mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(congress.startDate).toLocaleDateString()} - {new Date(congress.endDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{congress.location}</span>
                  <span className="flex items-center gap-1"><Users className="w-4 h-4" />{congress.attendees.length} attendees</span>
                </div>
                
                {/* Deadlines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div className="p-3 bg-surface-elevated rounded-lg">
                    <div className="text-xs text-text-muted mb-1">Abstract Deadline</div>
                    <div className="font-medium text-text-primary">{new Date(congress.abstractDeadline).toLocaleDateString()}</div>
                  </div>
                  {congress.lateBreakingDeadline && (
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Late-Breaking Deadline</div>
                      <div className="font-medium text-text-primary">{new Date(congress.lateBreakingDeadline).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
                
                {/* Submissions */}
                {congress.submissions.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-text-muted mb-2">Planned Submissions</div>
                    <div className="space-y-2">
                      {congress.submissions.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-surface-elevated rounded">
                          <div className="flex items-center gap-2">
                            <Badge color={sub.status === 'draft' ? 'amber' : sub.status === 'submitted' ? 'purple' : 'green'} size="sm">{sub.status}</Badge>
                            <span className="text-sm text-text-primary">{sub.title}</span>
                          </div>
                          <span className="text-xs text-text-muted">{sub.presenterName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {congress.symposiumPlanned && (
                  <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Presentation className="w-4 h-4" />
                      <span className="text-sm font-medium">Symposium Planned</span>
                    </div>
                    {congress.symposiumDetails && (
                      <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">{congress.symposiumDetails}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSciCommDataIntegration = () => (
    <div className="space-y-4 md:space-y-6">
      {/* R&D Connected Banner */}
      <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 dark:text-teal-300">R&D Connected</h3>
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
              Scientific Communications automatically surfaces data from Clinical, Safety, and Regulatory modules.
              When a safety signal is detected or clinical data locks, affected publications and claims are flagged instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Active Alerts" value={String(alertStats.total)} icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Critical" value={String(alertStats.critical)} subtitle="Action required" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard title="Warnings" value={String(alertStats.warning)} icon={<AlertCircle className="w-5 h-5" />} />
        <StatCard title="Info" value={String(alertStats.info)} icon={<Lightbulb className="w-5 h-5" />} />
      </div>

      {/* Data Integration Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Data Integration Alerts</h3>
            <Button variant="outline" size="sm" onClick={() => {
              toast.success('Data integration alerts refreshed');
            }}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dataIntegrationAlerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg border ${
                alert.severity === 'critical' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' :
                alert.severity === 'warning' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' :
                'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/50' :
                    alert.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/50' :
                    'bg-blue-100 dark:bg-blue-900/50'
                  }`}>
                    {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
                     alert.severity === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                     <Lightbulb className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue'} size="sm">
                        {alert.severity}
                      </Badge>
                      <Badge color="gray" size="sm">{alert.sourceModule}</Badge>
                      <Badge color={alert.status === 'resolved' ? 'green' : alert.status === 'acknowledged' ? 'blue' : 'amber'} size="sm">
                        {alert.status}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-text-primary">{alert.title}</h4>
                    <p className="text-sm text-text-secondary mt-1">{alert.description}</p>
                    
                    {/* Affected Items */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alert.affectedPublications.map(pubId => {
                        const pub = sciPublications.find(p => p.id === pubId);
                        return pub ? (
                          <div key={pubId} className="flex items-center gap-1 text-xs px-2 py-1 bg-white dark:bg-surface-card rounded border border-border">
                            <BookOpen className="w-3 h-3" /> {pub.shortTitle}
                          </div>
                        ) : null;
                      })}
                      {alert.affectedClaims.map(claimId => {
                        const claim = scientificClaims.find(c => c.id === claimId);
                        return claim ? (
                          <div key={claimId} className="flex items-center gap-1 text-xs px-2 py-1 bg-white dark:bg-surface-card rounded border border-border">
                            <FileCheck className="w-3 h-3" /> {claim.claimCode}
                          </div>
                        ) : null;
                      })}
                    </div>
                    
                    {/* Recommended Action */}
                    <div className="mt-3 p-3 bg-white/50 dark:bg-surface-card rounded-lg">
                      <div className="text-xs font-medium text-text-muted mb-1">Recommended Action</div>
                      <div className="text-sm text-text-primary">{alert.recommendedAction}</div>
                    </div>
                    
                    {alert.status !== 'resolved' && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button variant="primary" size="sm" onClick={() => {
                          toast.success(`Alert "${alert.title}" acknowledged`);
                        }}>Acknowledge</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          toast.success(`Alert "${alert.title}" marked as resolved`);
                        }}>Mark Resolved</Button>
                      </div>
                    )}
                    
                    {alert.resolvedDate && (
                      <div className="mt-2 text-xs text-text-muted">
                        Resolved by {alert.resolvedBy} on {new Date(alert.resolvedDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPublications = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard title="Total Publications" value={String(pubStats.total)} subtitle="All time" icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="In Pipeline" value={String(pubStats.inPipeline)} subtitle={`${pubStats.atRisk} at risk`} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Scientific Claims" value={String(claimStats.total)} subtitle={`${claimStats.approved} approved`} icon={<FileCheck className="w-5 h-5" />} />
        <StatCard title="Upcoming Congresses" value={String(congressStats.upcoming)} subtitle={`${congressStats.pendingSubmissions} drafts pending`} icon={<Calendar className="w-5 h-5" />} />
        <StatCard title="Data Alerts" value={String(alertStats.total)} subtitle={alertStats.critical > 0 ? `${alertStats.critical} critical` : 'All clear'} icon={<Database className="w-5 h-5" />} />
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg w-fit">
        {[
          { id: 'pipeline', label: 'Publications', icon: <BookOpen className="w-4 h-4" />, count: pubStats.atRisk > 0 ? pubStats.atRisk : undefined, alert: pubStats.withSignalImpact > 0 },
          { id: 'platform', label: 'Scientific Platform', icon: <FileCheck className="w-4 h-4" />, count: claimStats.requiresReview > 0 ? claimStats.requiresReview : undefined, alert: claimStats.requiresReview > 0 },
          { id: 'congresses', label: 'Congresses', icon: <Calendar className="w-4 h-4" />, count: congressStats.pendingSubmissions > 0 ? congressStats.pendingSubmissions : undefined },
          { id: 'data-integration', label: 'Data Integration', icon: <Database className="w-4 h-4" />, count: alertStats.critical > 0 ? alertStats.critical : undefined, alert: alertStats.critical > 0 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSciCommTab(tab.id as typeof sciCommTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              sciCommTab === tab.id ? 'bg-surface-card text-purple-600 shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${tab.alert ? 'bg-amber-500 text-white' : 'bg-surface-base text-text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {sciCommTab === 'pipeline' && renderSciCommPipeline()}
      {sciCommTab === 'platform' && renderSciCommPlatform()}
      {sciCommTab === 'congresses' && renderSciCommCongresses()}
      {sciCommTab === 'data-integration' && renderSciCommDataIntegration()}
    </div>
  );

  const renderAdvisoryBoards = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Advisory Boards" value="8" subtitle="2025 YTD" icon={<Users className="w-5 h-5" />} />
        <StatCard title="Upcoming" value="3" subtitle="Next 90 days" icon={<Calendar className="w-5 h-5" />} />
        <StatCard title="Total Participants" value="94" subtitle="Across all boards" icon={<UserCircle className="w-5 h-5" />} />
        <StatCard title="Insights Generated" value="156" subtitle="42 actioned" icon={<Lightbulb className="w-5 h-5" />} />
      </div>
      <Card>
        <CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Advisory Boards</h3><Button variant="primary" size="sm" onClick={() => {
          openModal('plan-advisory-board');
        }}><Plus className="w-4 h-4 mr-1" /> Plan Advisory Board</Button></div></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {MOCK_ADVISORY_BOARDS.map(ab => (
              <div key={ab.id} className="p-4 rounded-lg border border-border hover:border-accent-purple/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div><div className="flex items-center gap-2 mb-1"><Badge color={ab.type === 'scientific' ? 'purple' : ab.type === 'clinical' ? 'blue' : 'green'} size="sm">{ab.type}</Badge><Badge color={ab.status === 'confirmed' ? 'green' : 'amber'} size="sm">{ab.status}</Badge></div><h4 className="font-medium text-text-primary text-lg">{ab.name}</h4></div>
                  <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => {
                    openModal('view-advisory-board', { id: ab.id, name: ab.name });
                  }}><Eye className="w-4 h-4 mr-1" /> View</Button></div>
                </div>
                <div className="flex items-center gap-6 text-sm text-text-muted mb-4"><span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{ab.date}</span><span className="flex items-center gap-1"><Users className="w-4 h-4" />{ab.participantCount} participants</span><span className="flex items-center gap-1"><Globe className="w-4 h-4" />{ab.format}</span><span className="flex items-center gap-1"><Pill className="w-4 h-4" />{ab.product}</span></div>
                <div className="bg-surface-elevated p-3 rounded-lg"><div className="text-xs font-medium text-text-muted mb-2">Objectives</div><ul className="text-sm text-text-secondary space-y-1">{ab.objectives.map((obj, i) => <li key={i}>• {obj}</li>)}</ul></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCongresses = () => (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">2025-2026 Congress Calendar</h3><Button variant="primary" size="sm" onClick={() => {
          openModal('add-congress-calendar');
        }}><Plus className="w-4 h-4 mr-1" /> Add Congress</Button></div></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[{ name: 'ASCO Annual Meeting 2026', dates: 'May 29 - Jun 2, 2026', location: 'Chicago, IL', tier: 'tier-1', abstracts: 8, activities: 24, status: 'planning' }, { name: 'ASH Annual Meeting 2025', dates: 'Dec 5-8, 2025', location: 'San Diego, CA', tier: 'tier-1', abstracts: 5, activities: 18, status: 'ready' }].map((congress, i) => (
              <div key={i} className="p-4 rounded-lg border border-border hover:border-accent-blue/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div><div className="flex items-center gap-2 mb-1"><Badge color={congress.tier === 'tier-1' ? 'purple' : 'blue'} size="sm">{congress.tier}</Badge><Badge color={congress.status === 'ready' ? 'green' : 'amber'} size="sm">{congress.status}</Badge></div><h4 className="font-medium text-text-primary text-lg">{congress.name}</h4><div className="flex items-center gap-4 text-sm text-text-muted mt-2"><span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{congress.dates}</span><span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{congress.location}</span></div></div>
                  <div className="flex items-center gap-6 text-center"><div><div className="text-2xl font-bold text-accent-blue">{congress.abstracts}</div><div className="text-xs text-text-muted">Abstracts</div></div><div><div className="text-2xl font-bold text-accent-purple">{congress.activities}</div><div className="text-xs text-text-muted">Activities</div></div></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MEDICAL INFORMATION CENTER - v0.5.0
  // ============================================================================
  
  const [medInfoTab, setMedInfoTab] = useState<'inquiries' | 'responses' | 'signals' | 'analytics'>('inquiries');
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);

  // Medical Information Center - Demo Data (imported from medical-affairs-data.ts)
  const medicalInquiries = [
    { id: 'mir-001', inquiryNumber: 'MIR-2026-0142', type: 'hcp' as const, status: 'in-progress' as const, priority: 'high' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Cardiac monitoring requirements', category: 'Safety & Tolerability', summary: 'Oncologist inquiring about ECG monitoring frequency and QTc prolongation management guidelines.', inquirerName: 'Dr. Robert Anderson', inquirerCredentials: 'MD, FACP', inquirerInstitution: 'Cleveland Clinic', receivedDate: '2026-01-02T09:15:00Z', dueDate: '2026-01-03T09:15:00Z', assignedTo: 'Dr. Jennifer Walsh', isOverdue: false, hasSignalAlert: true, signalId: 'sig-2' },
    { id: 'mir-002', inquiryNumber: 'MIR-2026-0143', type: 'patient' as const, status: 'open' as const, priority: 'standard' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Dosing with food', category: 'Dosing & Administration', summary: 'Patient asking whether Nexavant should be taken with or without food.', inquirerName: 'Margaret Thompson', receivedDate: '2026-01-02T11:30:00Z', dueDate: '2026-01-04T11:30:00Z', assignedTo: 'Sarah Mitchell', isOverdue: false, hasSignalAlert: false },
    { id: 'mir-003', inquiryNumber: 'MIR-2026-0144', type: 'hcp' as const, status: 'responded' as const, priority: 'high' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Drug interaction - warfarin', category: 'Drug Interactions', summary: 'Physician inquiring about potential interaction between Nexavant and warfarin.', inquirerName: 'Dr. Lisa Chen', inquirerCredentials: 'PharmD, BCOP', inquirerInstitution: 'Johns Hopkins Hospital', receivedDate: '2026-01-01T14:00:00Z', dueDate: '2026-01-02T14:00:00Z', respondedDate: '2026-01-02T10:30:00Z', assignedTo: 'Dr. Jennifer Walsh', isOverdue: false, hasSignalAlert: false },
    { id: 'mir-004', inquiryNumber: 'MIR-2026-0145', type: 'internal' as const, status: 'in-progress' as const, priority: 'standard' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Competitive positioning data', category: 'Comparative Data', summary: 'MSL requesting comparative efficacy data versus sotorasib for KOL discussion.', inquirerName: 'Michael Torres', inquirerCredentials: 'PhD', receivedDate: '2025-12-30T16:00:00Z', dueDate: '2026-01-03T16:00:00Z', assignedTo: 'Dr. Amanda Foster', isOverdue: false, hasSignalAlert: false },
    { id: 'mir-005', inquiryNumber: 'MIR-2026-0146', type: 'hcp' as const, status: 'pending-review' as const, priority: 'urgent' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Hepatotoxicity management', category: 'Safety & Tolerability', summary: 'Urgent inquiry about Grade 2 transaminase elevation management and rechallenge guidance.', inquirerName: 'Dr. James Rodriguez', inquirerCredentials: 'MD, PhD', inquirerInstitution: 'MD Anderson Cancer Center', receivedDate: '2026-01-02T08:00:00Z', dueDate: '2026-01-02T16:00:00Z', assignedTo: 'Dr. Jennifer Walsh', isOverdue: false, hasSignalAlert: true, signalId: 'sig-1' },
    { id: 'mir-006', inquiryNumber: 'MIR-2026-0147', type: 'consumer' as const, status: 'open' as const, priority: 'standard' as const, productName: 'LIG-2847 (Nexavant)', topic: 'Patient assistance program', category: 'Access', summary: 'Consumer calling about patient assistance programs and copay support options.', inquirerName: 'John Williams', receivedDate: '2026-01-02T13:45:00Z', dueDate: '2026-01-05T13:45:00Z', assignedTo: 'Customer Support Team', isOverdue: false, hasSignalAlert: false },
  ];

  const standardResponses = [
    { id: 'sr-001', responseCode: 'SR-LIG2847-001', title: 'Dosing & Administration', topic: 'General dosing guidance', category: 'Dosing & Administration', productName: 'LIG-2847 (Nexavant)', summary: 'Standard response for dosing and administration questions including food effect information.', version: '2.0', effectiveDate: '2025-11-15', status: 'current' as const, usageCount: 147, requiresReview: false, linkedSignalIds: [] },
    { id: 'sr-002', responseCode: 'SR-LIG2847-002', title: 'Cardiac Safety Profile - QTc Monitoring', topic: 'QTc prolongation and cardiac monitoring', category: 'Safety & Tolerability', productName: 'LIG-2847 (Nexavant)', summary: 'Response addressing cardiac safety, QTc monitoring requirements, and management guidelines.', version: '1.2', effectiveDate: '2025-09-01', status: 'under-review' as const, usageCount: 89, requiresReview: true, reviewReason: 'Active safety signal SIG-2026-002 (QTc prolongation) under evaluation', linkedSignalIds: ['sig-2'] },
    { id: 'sr-003', responseCode: 'SR-LIG2847-003', title: 'Drug Interactions', topic: 'Drug-drug interactions and concomitant medications', category: 'Drug Interactions', productName: 'LIG-2847 (Nexavant)', summary: 'Comprehensive response on drug interactions including CYP3A4 and QT-prolonging medications.', version: '1.1', effectiveDate: '2025-10-01', status: 'current' as const, usageCount: 62, requiresReview: false, linkedSignalIds: [] },
    { id: 'sr-004', responseCode: 'SR-LIG2847-004', title: 'Hepatotoxicity Management', topic: 'Hepatotoxicity monitoring and dose modification', category: 'Safety & Tolerability', productName: 'LIG-2847 (Nexavant)', summary: 'Response addressing hepatotoxicity risk, monitoring, and dose modification guidance.', version: '2.1', effectiveDate: '2025-12-01', status: 'under-review' as const, usageCount: 156, requiresReview: true, reviewReason: 'Confirmed safety signal SIG-2026-001 (Hepatotoxicity) - CCDS update pending', linkedSignalIds: ['sig-1'] },
    { id: 'sr-005', responseCode: 'SR-LIG2847-005', title: 'Special Populations - Renal Impairment', topic: 'Dosing in renal impairment', category: 'Special Populations', productName: 'LIG-2847 (Nexavant)', summary: 'Standard response for dosing guidance in patients with renal impairment.', version: '1.0', effectiveDate: '2025-08-01', status: 'current' as const, usageCount: 34, requiresReview: false, linkedSignalIds: [] },
    { id: 'sr-006', responseCode: 'SR-LIG2847-006', title: 'Interstitial Lung Disease', topic: 'ILD risk and monitoring', category: 'Safety & Tolerability', productName: 'LIG-2847 (Nexavant)', summary: 'Response addressing ILD/pneumonitis risk and management.', version: '1.1', effectiveDate: '2025-10-15', status: 'under-review' as const, usageCount: 28, requiresReview: true, reviewReason: 'Emerging safety signal SIG-2026-003 (ILD) under evaluation', linkedSignalIds: ['sig-3'] },
  ];

  const signalImpacts = [
    { signalId: 'sig-1', signalCode: 'SIG-2026-001', signalTitle: 'Hepatotoxicity - Grade 3+ transaminase elevations', severity: 'critical' as const, affectedResponseCount: 1, affectedResponses: ['sr-004'], affectedInquiryCount: 1, affectedInquiries: ['mir-005'], detectedDate: '2024-11-15', status: 'confirmed' as const, productName: 'LIG-2847 (Nexavant)', recommendedAction: 'Review and update hepatotoxicity response to align with CCDS update recommendations', reviewDeadline: '2026-01-15' },
    { signalId: 'sig-2', signalCode: 'SIG-2026-002', signalTitle: 'QTc prolongation >60ms from baseline', severity: 'high' as const, affectedResponseCount: 1, affectedResponses: ['sr-002'], affectedInquiryCount: 1, affectedInquiries: ['mir-001'], detectedDate: '2024-10-01', status: 'confirmed' as const, productName: 'LIG-2847 (Nexavant)', recommendedAction: 'Verify cardiac monitoring guidance reflects latest clinical data', reviewDeadline: '2026-01-31' },
    { signalId: 'sig-3', signalCode: 'SIG-2026-003', signalTitle: 'Interstitial Lung Disease', severity: 'high' as const, affectedResponseCount: 1, affectedResponses: ['sr-006'], affectedInquiryCount: 0, affectedInquiries: [], detectedDate: '2024-12-01', status: 'under-review' as const, productName: 'LIG-2847 (Nexavant)', recommendedAction: 'Monitor signal evaluation progress; prepare response update if signal confirmed', reviewDeadline: '2026-02-15' },
  ];

  const getInquiryTypeLabel = (type: string) => {
    const labels: Record<string, string> = { hcp: 'HCP', patient: 'Patient', consumer: 'Consumer', internal: 'Internal' };
    return labels[type] || type;
  };

  const getInquiryTypeColor = (type: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = { hcp: 'purple', patient: 'blue', consumer: 'green', internal: 'gray' };
    return colors[type] || 'gray';
  };

  const getStatusColor = (status: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = { open: 'amber', 'in-progress': 'blue', 'pending-review': 'purple', responded: 'green', closed: 'gray', current: 'green', 'under-review': 'amber', superseded: 'gray', draft: 'blue' };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = { urgent: 'red', high: 'amber', standard: 'gray' };
    return colors[priority] || 'gray';
  };

  const getSeverityColor = (severity: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = { critical: 'red', high: 'amber', medium: 'blue', low: 'gray' };
    return colors[severity] || 'gray';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getSlaHours = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours;
  };

  // Statistics
  const inquiryStats = {
    total: medicalInquiries.length,
    open: medicalInquiries.filter(i => i.status === 'open').length,
    inProgress: medicalInquiries.filter(i => i.status === 'in-progress').length,
    urgent: medicalInquiries.filter(i => i.priority === 'urgent').length,
    avgResponseTime: '18.4h',
    slaCompliance: 96.2,
  };

  const responseStats = {
    total: standardResponses.length,
    current: standardResponses.filter(r => r.status === 'current').length,
    underReview: standardResponses.filter(r => r.status === 'under-review').length,
    signalAffected: standardResponses.filter(r => r.requiresReview).length,
  };

  const signalStats = {
    activeSignals: signalImpacts.filter(s => (s.status as string) !== 'closed').length,
    criticalCount: signalImpacts.filter(s => s.severity === 'critical').length,
    totalAffectedResponses: signalImpacts.reduce((sum, s) => sum + s.affectedResponseCount, 0),
  };

  const renderMedInfoInquiries = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Open Inquiries" value={String(inquiryStats.open)} subtitle={`${inquiryStats.total} total YTD`} icon={<MessageSquare className="w-5 h-5" />} />
        <StatCard title="Avg Response Time" value={inquiryStats.avgResponseTime} trend={{ value: 15, direction: 'down' as const, label: 'improvement' }} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="SLA Compliance" value={`${inquiryStats.slaCompliance}%`} subtitle="Target: 95%" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Urgent Queue" value={String(inquiryStats.urgent)} subtitle="Requires immediate attention" icon={<AlertCircle className="w-5 h-5 text-red-500" />} />
      </div>

      {/* Inquiry List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Medical Information Inquiries</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Search inquiries..." className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-surface-base focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                openModal('filter-inquiries');
              }}><Filter className="w-4 h-4 mr-1" /> Filter</Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal('create-inquiry');
              }}><Plus className="w-4 h-4 mr-1" /> New Inquiry</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {medicalInquiries.map(inquiry => {
              const slaHours = getSlaHours(inquiry.dueDate);
              const isOverdue = slaHours < 0;
              const isCritical = slaHours >= 0 && slaHours <= 8;
              
              return (
                <div key={inquiry.id} className={`p-4 rounded-lg border transition-colors cursor-pointer ${inquiry.hasSignalAlert ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/10' : 'border-border hover:border-teal-500/30'}`} onClick={() => setSelectedInquiry(inquiry.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-text-muted">{inquiry.inquiryNumber}</span>
                        <Badge color={getInquiryTypeColor(inquiry.type)} size="sm">{getInquiryTypeLabel(inquiry.type)}</Badge>
                        <Badge color={getPriorityColor(inquiry.priority)} size="sm">{inquiry.priority}</Badge>
                        <Badge color={getStatusColor(inquiry.status)} size="sm">{inquiry.status.replace('-', ' ')}</Badge>
                        {inquiry.hasSignalAlert && (
                          <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" /> Signal Alert
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-text-primary">{inquiry.topic}</h4>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-1">{inquiry.summary}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><UserCircle className="w-3.5 h-3.5" />{inquiry.inquirerName}{inquiry.inquirerCredentials && `, ${inquiry.inquirerCredentials}`}</span>
                        {inquiry.inquirerInstitution && <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" />{inquiry.inquirerInstitution}</span>}
                        <span className="flex items-center gap-1"><Pill className="w-3.5 h-3.5" />{inquiry.productName}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {(inquiry.status as string) !== 'responded' && (inquiry.status as string) !== 'closed' && (
                        <div className={`text-right ${isOverdue ? 'text-red-600' : isCritical ? 'text-amber-600' : 'text-text-muted'}`}>
                          <div className="text-lg font-bold">{isOverdue ? 'OVERDUE' : `${slaHours}h`}</div>
                          <div className="text-xs">SLA remaining</div>
                        </div>
                      )}
                      <div className="text-xs text-text-muted">{formatTimeAgo(inquiry.receivedDate)}</div>
                      <div className="text-xs text-text-muted">Assigned: {inquiry.assignedTo}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMedInfoResponses = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Responses" value={String(responseStats.total)} subtitle="Active library" icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="Current" value={String(responseStats.current)} subtitle="Ready to use" icon={<CheckCircle className="w-5 h-5 text-green-500" />} />
        <StatCard title="Under Review" value={String(responseStats.underReview)} subtitle="Pending updates" icon={<Clock className="w-5 h-5 text-amber-500" />} />
        <StatCard title="Signal-Affected" value={String(responseStats.signalAffected)} subtitle="Requires attention" icon={<AlertTriangle className="w-5 h-5 text-red-500" />} />
      </div>

      {/* Response Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Standard Response Library</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" placeholder="Search responses..." className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-surface-base focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                openModal('filter-responses');
              }}><Filter className="w-4 h-4 mr-1" /> Filter</Button>
              <Button variant="primary" size="sm" onClick={() => {
                openModal('create-response');
              }}><Plus className="w-4 h-4 mr-1" /> New Response</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {standardResponses.map(response => (
              <div key={response.id} className={`p-4 rounded-lg border transition-colors cursor-pointer ${response.requiresReview ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/10' : 'border-border hover:border-teal-500/30'}`} onClick={() => setSelectedResponse(response.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-text-muted">{response.responseCode}</span>
                      <Badge color={getStatusColor(response.status)} size="sm">{response.status.replace('-', ' ')}</Badge>
                      <span className="text-xs text-text-muted">v{response.version}</span>
                      {response.requiresReview && (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" /> Review Required
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-text-primary">{response.title}</h4>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-1">{response.summary}</p>
                    {response.requiresReview && response.reviewReason && (
                      <div className="mt-2 p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {response.reviewReason}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{response.category}</span>
                      <span className="flex items-center gap-1"><Pill className="w-3.5 h-3.5" />{response.productName}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Effective: {response.effectiveDate}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-text-primary">{response.usageCount}</div>
                      <div className="text-xs text-text-muted">times used</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      openModal('view-response', { responseId: response.id, responseCode: response.responseCode });
                    }}><Eye className="w-3.5 h-3.5 mr-1" /> View</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMedInfoSignals = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Alert Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Safety Signal Alert Integration</h3>
            <p className="text-sm text-text-secondary mt-1">
              {signalStats.activeSignals} active safety signals affecting {signalStats.totalAffectedResponses} standard responses. 
              Review required to ensure medical information aligns with latest safety data.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Active Signals" value={String(signalStats.activeSignals)} subtitle="From Safety module" icon={<Activity className="w-5 h-5" />} />
        <StatCard title="Critical Signals" value={String(signalStats.criticalCount)} subtitle="Immediate attention" icon={<AlertCircle className="w-5 h-5 text-red-500" />} />
        <StatCard title="Affected Responses" value={String(signalStats.totalAffectedResponses)} subtitle="Require review" icon={<FileText className="w-5 h-5 text-amber-500" />} />
      </div>

      {/* Signal List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Safety Signal Impact on Medical Information</h3>
            <Button variant="outline" size="sm" onClick={() => {
              toast.info('Navigation to Safety & Pharmacovigilance module');
            }}><Link2 className="w-4 h-4 mr-1" /> View in Safety Module</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {signalImpacts.map(signal => {
              const affectedResponses = standardResponses.filter(r => (signal.affectedResponses as string[]).includes(r.id));
              const affectedInquiries = medicalInquiries.filter(i => (signal.affectedInquiries as string[]).includes(i.id));
              
              return (
                <div key={signal.signalId} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono text-text-muted">{signal.signalCode}</span>
                        <Badge color={getSeverityColor(signal.severity)} size="sm">{signal.severity}</Badge>
                        <Badge color={signal.status === 'confirmed' ? 'green' : 'amber'} size="sm">{signal.status.replace('-', ' ')}</Badge>
                      </div>
                      <h4 className="font-medium text-text-primary">{signal.signalTitle}</h4>
                      <div className="text-sm text-text-secondary mt-1">{signal.productName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted">Review Deadline</div>
                      <div className="font-medium text-text-primary">{signal.reviewDeadline}</div>
                    </div>
                  </div>
                  
                  {signal.recommendedAction && (
                    <div className="p-3 bg-surface-elevated rounded-lg mb-3">
                      <div className="text-xs font-medium text-text-muted mb-1">Recommended Action</div>
                      <div className="text-sm text-text-primary">{signal.recommendedAction}</div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <div className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Affected Responses ({signal.affectedResponseCount})
                      </div>
                      <div className="space-y-1">
                        {affectedResponses.map(r => (
                          <div key={r.id} className="text-sm p-2 bg-surface-base rounded border border-border flex items-center justify-between">
                            <span>{r.responseCode}: {r.title}</span>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedResponse(r.id);
                            }}><ExternalLink className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Affected Inquiries ({signal.affectedInquiryCount})
                      </div>
                      <div className="space-y-1">
                        {affectedInquiries.length > 0 ? affectedInquiries.map(i => (
                          <div key={i.id} className="text-sm p-2 bg-surface-base rounded border border-border flex items-center justify-between">
                            <span>{i.inquiryNumber}: {i.topic}</span>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedInquiry(i.id);
                            }}><ExternalLink className="w-3 h-3" /></Button>
                          </div>
                        )) : (
                          <div className="text-sm text-text-muted p-2">No active inquiries affected</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* R&D Connected Callout */}
      <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-300 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-700 dark:text-teal-300">R&D Connected</h3>
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
              Safety signals automatically surface in Medical Affairs. When Safety finds something, Medical Information knows instantly.
              No more siloed systems. No more outdated responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMedInfoAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Total Inquiries (YTD)" value="2,847" trend={{ value: 12, direction: 'up' as const, label: 'vs last year' }} icon={<MessageSquare className="w-5 h-5" />} />
        <StatCard title="Response Library" value={String(responseStats.total)} subtitle="Standard responses" icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="SLA Compliance" value="96.2%" subtitle="Target: 95%" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Satisfaction Score" value="4.8/5" subtitle="Based on 847 responses" icon={<Star className="w-5 h-5" />} />
      </div>
      <Card>
        <CardHeader><h3 className="font-semibold text-text-primary">Analytics Dashboard</h3></CardHeader>
        <CardContent>
          <div className="text-center py-12 text-text-muted">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Full analytics dashboard coming in v0.5.4</p>
            <p className="text-sm mt-1">Inquiry trends, response usage, topic analysis, and more</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMedicalInfo = () => (
    <div className="space-y-4 md:space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg w-fit">
        {[
          { id: 'inquiries', label: 'Inquiries', icon: <MessageSquare className="w-4 h-4" />, count: inquiryStats.open },
          { id: 'responses', label: 'Response Library', icon: <BookOpen className="w-4 h-4" />, count: responseStats.signalAffected > 0 ? responseStats.signalAffected : undefined, alert: responseStats.signalAffected > 0 },
          { id: 'signals', label: 'Signal Alerts', icon: <Shield className="w-4 h-4" />, count: signalStats.activeSignals, alert: signalStats.criticalCount > 0 },
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMedInfoTab(tab.id as typeof medInfoTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${medInfoTab === tab.id ? 'bg-surface-card text-teal-600 shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${tab.alert ? 'bg-amber-500 text-white' : 'bg-surface-base text-text-muted'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {medInfoTab === 'inquiries' && renderMedInfoInquiries()}
      {medInfoTab === 'responses' && renderMedInfoResponses()}
      {medInfoTab === 'signals' && renderMedInfoSignals()}
      {medInfoTab === 'analytics' && renderMedInfoAnalytics()}
    </div>
  );

  const renderGrantsIIR = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Active Grants" value="24" subtitle="$8.2M committed" icon={<Gift className="w-5 h-5" />} />
        <StatCard title="IIR Studies" value="12" subtitle="4 enrolling" icon={<FlaskConical className="w-5 h-5" />} />
        <StatCard title="Pending Review" value="6" subtitle="$1.4M requested" icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Publications from IIR" value="18" subtitle="2024-2025" icon={<BookOpen className="w-5 h-5" />} />
      </div>
      <Card>
        <CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Active Grants & IIR</h3><Button variant="primary" size="sm" onClick={() => {
          openModal('create-grant');
        }}><Plus className="w-4 h-4 mr-1" /> New Grant</Button></div></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[{ id: 'IIR-2025-012', type: 'IIR', title: 'Real-World Outcomes of Nexavant in Elderly Patients', pi: 'Dr. Sarah Chen', institution: 'MSKCC', amount: '$450,000', status: 'active', progress: 65 }].map(grant => (
              <div key={grant.id} className="p-4 rounded-lg border border-border hover:border-accent-green/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div><div className="flex items-center gap-2 mb-1"><span className="text-sm font-mono text-text-muted">{grant.id}</span><Badge color="purple" size="sm">{grant.type}</Badge><Badge color="green" size="sm">{grant.status}</Badge></div><h4 className="font-medium text-text-primary">{grant.title}</h4><div className="flex items-center gap-4 text-sm text-text-muted mt-1"><span className="flex items-center gap-1"><UserCircle className="w-4 h-4" />{grant.pi}</span><span className="flex items-center gap-1"><Building className="w-4 h-4" />{grant.institution}</span><span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{grant.amount}</span></div></div>
                  <Button variant="outline" size="sm" onClick={() => {
                    openModal('view-grant', { grantId: grant.id });
                  }}>View Details</Button>
                </div>
                <div><div className="flex items-center justify-between text-xs text-text-muted mb-1"><span>Progress</span><span>{grant.progress}%</span></div><div className="h-2 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-accent-green rounded-full" style={{ width: `${grant.progress}%` }} /></div></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MEDICAL REVIEW VIEW (v0.5.3)
  // ============================================================================

  const [reviewTab, setReviewTab] = useState<'queue' | 'items' | 'comments' | 'metrics'>('queue');
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewItem | null>(null);
  const reviewMetrics = getReviewMetrics();
  const queueStats = getReviewQueueStats();
  const criticalReviews = getCriticalReviews();
  const overdueReviews = getOverdueReviews();
  const signalRelatedReviews = getSignalRelatedReviews();
  const typeDistribution = getReviewTypeDistribution();

  const getReviewStatusColor = (status: ReviewStatus): BadgeColor => {
    const colors: Record<ReviewStatus, BadgeColor> = {
      'draft': 'slate',
      'submitted': 'blue',
      'medical-review': 'purple',
      'legal-review': 'amber',
      'regulatory-review': 'teal',
      'revision-requested': 'orange',
      'approved': 'green',
      'approved-with-conditions': 'emerald',
      'rejected': 'red',
      'expired': 'slate',
    };
    return colors[status] || 'slate';
  };

  const getReviewPriorityColor = (priority: string): BadgeColor => {
    const colors: Record<string, BadgeColor> = {
      'critical': 'red',
      'high': 'orange',
      'standard': 'blue',
      'low': 'slate',
    };
    return colors[priority] || 'slate';
  };

  const renderMedicalReviewQueue = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {queueStats.map(queue => (
          <Card key={queue.role} className={queue.overdue > 0 ? 'border-red-200 bg-red-50/30' : queue.critical > 0 ? 'border-amber-200 bg-amber-50/30' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary capitalize">{queue.role}</span>
                {queue.overdue > 0 && <Badge color="red" size="sm">{queue.overdue} overdue</Badge>}
              </div>
              <div className="text-2xl font-bold text-text-primary">{queue.pending}</div>
              <div className="text-xs text-text-muted mt-1">
                {queue.critical > 0 && <span className="text-red-600 font-medium">{queue.critical} critical</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Critical & Overdue Items
              </h3>
              <Badge color="red">{criticalReviews.length + overdueReviews.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...criticalReviews, ...overdueReviews].slice(0, 5).map(item => (
                <div key={item.id} className="p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer" onClick={() => setSelectedReviewItem(item)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-text-primary text-sm">{item.title}</div>
                      <div className="text-xs text-text-muted mt-1">{item.itemCode} • {REVIEW_TYPE_LABELS[item.type]}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge color={getReviewPriorityColor(item.priority)} size="sm">{item.priority}</Badge>
                      {item.isOverdue && <span className="text-xs text-red-600 font-medium">Overdue</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
                    <span>Due: {item.dueDate}</span>
                    {item.currentReviewer && <span>• {item.currentReviewer}</span>}
                  </div>
                </div>
              ))}
              {criticalReviews.length + overdueReviews.length === 0 && (
                <div className="text-center py-4 text-text-muted text-sm">No critical or overdue items</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                Signal-Related Reviews
              </h3>
              <Badge color="amber">{signalRelatedReviews.length}</Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">Items linked to active safety signals</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signalRelatedReviews.map(item => (
                <div key={item.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors cursor-pointer" onClick={() => setSelectedReviewItem(item)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-text-primary text-sm">{item.title}</div>
                      <div className="text-xs text-text-muted mt-1">{item.itemCode}</div>
                    </div>
                    <Badge color={getReviewStatusColor(item.status)} size="sm">{REVIEW_STATUS_LABELS[item.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {item.linkedSignalIds.map(sigId => (
                      <Badge key={sigId} color="red" size="sm" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {sigId}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {signalRelatedReviews.length === 0 && (
                <div className="text-center py-4 text-text-muted text-sm">No signal-related items</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMedicalReviewItems = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" placeholder="Search reviews..." className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-surface-card" />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            openModal('filter-reviews');
          }}><Filter className="w-4 h-4 mr-1" /> Filter</Button>
        </div>
        <Button variant="primary" size="sm" onClick={() => {
          openModal('create-submission');
        }}><Plus className="w-4 h-4 mr-1" /> New Submission</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-surface-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Reviewer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Due</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reviewItems.map(item => (
                <tr key={item.id} className={`hover:bg-surface-elevated/50 cursor-pointer ${item.hasSignalImpact ? 'bg-amber-50/30' : ''}`} onClick={() => setSelectedReviewItem(item)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary text-sm">{item.title}</div>
                    <div className="text-xs text-text-muted">{item.itemCode} • {item.productName}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{REVIEW_TYPE_LABELS[item.type]}</td>
                  <td className="px-4 py-3"><Badge color={getReviewStatusColor(item.status)} size="sm">{REVIEW_STATUS_LABELS[item.status]}</Badge></td>
                  <td className="px-4 py-3"><Badge color={getReviewPriorityColor(item.priority)} size="sm">{item.priority}</Badge></td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{item.currentReviewer || '-'}</td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${item.isOverdue ? 'text-red-600 font-medium' : 'text-text-secondary'}`}>{item.dueDate}</div>
                    {item.daysUntilDue > 0 && <div className="text-xs text-text-muted">{item.daysUntilDue}d left</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReviewItem(item);
                    }}><Eye className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );

  const renderMedicalReviewMetrics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Submissions" value={reviewMetrics.totalSubmissions.toString()} subtitle="All time" icon={<FileText className="w-5 h-5" />} />
        <StatCard title="Approved This Month" value={reviewMetrics.approvedThisMonth.toString()} trend={{ value: 15, direction: 'up', label: 'vs last month' }} icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard title="Avg Cycle Time" value={`${reviewMetrics.avgCycleTimeDays}d`} trend={{ value: 24, direction: 'down', label: 'improvement' }} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="First-Pass Approval" value={`${reviewMetrics.firstPassApprovalRate}%`} subtitle="Target: 70%" icon={<Target className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Review Pipeline Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Pending Review', value: reviewMetrics.pendingReview, color: 'bg-blue-500' },
                { label: 'Medical Review', value: reviewMetrics.inMedicalReview, color: 'bg-purple-500' },
                { label: 'Legal Review', value: reviewMetrics.inLegalReview, color: 'bg-amber-500' },
                { label: 'Regulatory Review', value: reviewMetrics.inRegulatoryReview, color: 'bg-teal-500' },
                { label: 'Awaiting Revision', value: reviewMetrics.awaitingRevision, color: 'bg-orange-500' },
              ].map(stage => (
                <div key={stage.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage?.color ?? ''}`} />
                    <span className="text-sm text-text-secondary">{stage.label}</span>
                  </div>
                  <span className="font-medium text-text-primary">{stage.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Reviews by Type</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeDistribution.map(type => (
                <div key={type.type} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">{REVIEW_TYPE_LABELS[type.type]}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-2 bg-surface-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(type.approved / type.count) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium text-text-primary w-8">{type.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMedicalReview = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Review" value={reviewMetrics.pendingReview.toString()} subtitle={`${reviewMetrics.inMedicalReview} in medical`} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="On-Time Rate" value={`${reviewMetrics.onTimeApprovalRate}%`} trend={{ value: 5, direction: 'up', label: 'vs target' }} icon={<Target className="w-5 h-5" />} />
        <StatCard title="Avg Cycle Time" value={`${reviewMetrics.avgCycleTimeDays}d`} trend={{ value: 24, direction: 'down', label: 'improvement' }} icon={<RefreshCw className="w-5 h-5" />} />
        <StatCard title="Signal-Related" value={signalRelatedReviews.length.toString()} subtitle="Requires expedited review" icon={<AlertTriangle className="w-5 h-5" />} />
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: 'queue', label: 'Review Queue', icon: <Layers className="w-4 h-4" /> },
          { id: 'items', label: 'All Items', icon: <FileText className="w-4 h-4" /> },
          { id: 'metrics', label: 'Metrics', icon: <BarChart3 className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReviewTab(tab.id as typeof reviewTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${reviewTab === tab.id ? 'bg-surface-card text-teal-600 border-t border-x border-border' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {reviewTab === 'queue' && renderMedicalReviewQueue()}
      {reviewTab === 'items' && renderMedicalReviewItems()}
      {reviewTab === 'metrics' && renderMedicalReviewMetrics()}

      {/* R&D Connected Callout */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-teal-700">R&D Connected: MLR ↔ Safety Integration</div>
              <p className="text-sm text-teal-600 mt-1">
                Safety signals automatically flag related promotional materials for expedited review. 
                When SIG-2026-001 (Hepatotoxicity) was detected, 2 pending materials were escalated to critical priority.
                That's not just compliance — that's proactive risk management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // ANALYTICS VIEW (v0.5.4)
  // ============================================================================

  const [analyticsTab, setAnalyticsTab] = useState<'kpis' | 'kol' | 'msl' | 'publications' | 'cross-module'>('kpis');
  const kpisAboveTarget = getKPIsAboveTarget();
  const kpisBelowTarget = getKPIsBelowTarget();
  const territoryRankings = getTerritoryRankings();
  const reviewBottlenecks = getReviewBottlenecks();
  const crossModuleAlertCounts = getCrossModuleAlertCount();
  const publicationImpactScore = getPublicationImpactScore();
  const mslProductivityIndex = getMSLProductivityIndex();

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getBenchmarkColor = (comparison?: string): string => {
    if (comparison === 'above') return 'text-green-600';
    if (comparison === 'below') return 'text-red-600';
    return 'text-amber-600';
  };

  const renderKPIDashboard = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {medAffairsKPIs.slice(0, 8).map(kpi => (
          <Card key={kpi.id} className={kpi.benchmarkComparison === 'below' ? 'border-red-200' : kpi.benchmarkComparison === 'above' ? 'border-green-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-muted">{kpi.name}</span>
                {getTrendIcon(kpi.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">{kpi.value}</span>
                <span className="text-sm text-text-muted">{kpi.unit}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
                <span className={`text-xs font-medium ${kpi.trendPercentage > 0 ? 'text-green-600' : kpi.trendPercentage < 0 ? 'text-red-600' : 'text-text-muted'}`}>
                  {kpi.trendPercentage > 0 ? '+' : ''}{kpi.trendPercentage}% vs prior
                </span>
                {kpi.target && (
                  <span className={`text-xs ${getBenchmarkColor(kpi.benchmarkComparison)}`}>
                    Target: {kpi.target}{kpi.unit === '%' || kpi.unit === 'days' ? kpi.unit : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              KPIs Above Target ({kpisAboveTarget.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpisAboveTarget.map(kpi => (
                <div key={kpi.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50/50">
                  <span className="text-sm text-text-secondary">{kpi.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-600">{kpi.value}{kpi.unit === '%' ? '%' : ''}</span>
                    <span className="text-xs text-text-muted">/ {kpi.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              KPIs Below Target ({kpisBelowTarget.length})
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpisBelowTarget.map(kpi => (
                <div key={kpi.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50">
                  <span className="text-sm text-text-secondary">{kpi.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-red-600">{kpi.value}{kpi.unit === '%' ? '%' : ''}</span>
                    <span className="text-xs text-text-muted">/ {kpi.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderKOLAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total KOLs" value={kolAnalyticsData.totalKOLs.toString()} subtitle={`${kolAnalyticsData.newKOLsThisQuarter} new this quarter`} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Engagement Rate" value={`${kolAnalyticsData.engagementRate}%`} trend={{ value: 8.3, direction: 'up', label: 'vs prior quarter' }} icon={<Target className="w-5 h-5" />} />
        <StatCard title="Avg Interactions/KOL" value={kolAnalyticsData.avgInteractionsPerKOL.toString()} icon={<Activity className="w-5 h-5" />} />
        <StatCard title="Coverage Rate" value={`${kolAnalyticsData.coverageRate}%`} subtitle="Target: 90%" icon={<PieChart className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">KOL Distribution by Tier</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { tier: 'Tier 1', count: kolAnalyticsData.tier1Count, color: 'bg-purple-500', percentage: Math.round(kolAnalyticsData.tier1Count / kolAnalyticsData.totalKOLs * 100) },
                { tier: 'Tier 2', count: kolAnalyticsData.tier2Count, color: 'bg-blue-500', percentage: Math.round(kolAnalyticsData.tier2Count / kolAnalyticsData.totalKOLs * 100) },
                { tier: 'Tier 3', count: kolAnalyticsData.tier3Count, color: 'bg-slate-400', percentage: Math.round(kolAnalyticsData.tier3Count / kolAnalyticsData.totalKOLs * 100) },
                { tier: 'Emerging', count: kolAnalyticsData.emergingCount, color: 'bg-green-500', percentage: Math.round(kolAnalyticsData.emergingCount / kolAnalyticsData.totalKOLs * 100) },
              ].map(tier => (
                <div key={tier.tier} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-primary">{tier.tier}</span>
                    <span className="text-text-muted">{tier.count} ({tier.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${tier?.color ?? ''} rounded-full`} style={{ width: `${tier.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Top Engaged KOLs</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kolAnalyticsData.topEngagedKOLs.map((kol, idx) => (
                <div key={kol.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary text-sm truncate">{kol.name}</div>
                    <div className="text-xs text-text-muted truncate">{kol.institution}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">{kol.interactions} interactions</div>
                    <div className="text-xs text-text-muted">{kol.insights} insights</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">KOLs by Therapeutic Area</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {kolAnalyticsData.kolsByTherapeuticArea.map(area => (
              <div key={area.area} className="text-center p-4 rounded-lg bg-surface-elevated">
                <div className="text-2xl font-bold text-text-primary">{area.count}</div>
                <div className="text-sm text-text-muted">{area.area}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMSLAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total MSLs" value={mslPerformanceData.totalMSLs.toString()} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Avg Interactions/MSL" value={mslPerformanceData.avgInteractionsPerMSL.toString()} trend={{ value: 12, direction: 'up', label: 'vs prior year' }} icon={<Activity className="w-5 h-5" />} />
        <StatCard title="Avg Insights/MSL" value={mslPerformanceData.avgInsightsPerMSL.toFixed(1)} icon={<Lightbulb className="w-5 h-5" />} />
        <StatCard title="Avg Coverage" value={`${mslPerformanceData.avgCoverageRate}%`} subtitle="Target: 90%" icon={<Target className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Territory Rankings</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {territoryRankings.map(territory => (
                <div key={territory.region} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-white ${territory.rank === 1 ? 'bg-yellow-500' : territory.rank === 2 ? 'bg-slate-400' : territory.rank === 3 ? 'bg-amber-600' : 'bg-slate-300'}`}>
                      {territory.rank}
                    </div>
                    <span className="font-medium text-text-primary">{territory.region}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">{Math.round(territory.score)}</div>
                    <div className="text-xs text-text-muted">Performance Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">MSL Productivity Index</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mslProductivityIndex.map(msl => (
                <div key={msl.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{msl.name}</span>
                    <span className={`font-medium ${msl.index >= msl.benchmark ? 'text-green-600' : 'text-amber-600'}`}>{msl.index}</span>
                  </div>
                  <div className="h-2 bg-surface-elevated rounded-full overflow-hidden relative">
                    <div className={`h-full ${msl.index >= msl.benchmark ? 'bg-green-500' : 'bg-amber-500'} rounded-full`} style={{ width: `${Math.min(msl.index, 100)}%` }} />
                    <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${msl.benchmark}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Activity Distribution by Type</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {mslPerformanceData.activityByType.map(activity => (
              <div key={activity.type} className="text-center p-4 rounded-lg bg-surface-elevated">
                <div className="text-2xl font-bold text-text-primary">{activity.count}</div>
                <div className="text-xs text-text-muted">{activity.type}</div>
                <div className="text-xs text-teal-600 mt-1">{activity.percentage}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPublicationAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Publications" value={publicationAnalyticsData.totalPublications.toString()} subtitle={`${publicationAnalyticsData.inPipeline} in pipeline`} icon={<BookOpen className="w-5 h-5" />} />
        <StatCard title="Published YTD" value={publicationAnalyticsData.publishedThisYear.toString()} trend={{ value: 18, direction: 'up', label: 'vs prior year' }} icon={<FileCheck className="w-5 h-5" />} />
        <StatCard title="Avg Time to Pub" value={`${publicationAnalyticsData.avgTimeToPublication}mo`} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Impact Score" value={publicationImpactScore.toString()} subtitle="Weighted avg IF" icon={<Award className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Publications by Journal</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {publicationAnalyticsData.publicationsByJournal.map(journal => (
                <div key={journal.journal} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-elevated transition-colors">
                  <div>
                    <div className="font-medium text-text-primary text-sm">{journal.journal}</div>
                    <div className="text-xs text-text-muted">IF: {journal.impactFactor}</div>
                  </div>
                  <Badge color="purple" size="sm">{journal.count} pubs</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Congress Presentations</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {publicationAnalyticsData.congressPresentations.map(congress => (
                <div key={congress.congress} className="p-3 rounded-lg bg-surface-elevated">
                  <div className="font-medium text-text-primary mb-2">{congress.congress}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{congress.abstracts}</div>
                      <div className="text-xs text-text-muted">Abstracts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{congress.posters}</div>
                      <div className="text-xs text-text-muted">Posters</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{congress.orals}</div>
                      <div className="text-xs text-text-muted">Orals</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCrossModuleAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {crossModuleAlertCounts.map(module => (
          <Card key={module.module} className={module.critical > 0 ? 'border-red-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-text-primary">{module.module} Integration</span>
                {module.critical > 0 && <Badge color="red" size="sm">{module.critical} critical</Badge>}
              </div>
              <div className="text-2xl font-bold text-text-primary">{module.alerts}</div>
              <div className="text-xs text-text-muted">Active correlations</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            Safety Signal Correlations
          </h3>
          <p className="text-xs text-text-muted mt-1">Cross-module data linking safety signals with Medical Affairs activities</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {crossModuleInsightsData.safetyCorrelations.map(signal => (
              <div key={signal.signalId} className="p-4 rounded-lg border border-amber-200 bg-amber-50/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{signal.signalName}</div>
                    <div className="text-sm text-text-muted">{signal.signalId}</div>
                  </div>
                  {signal.publicationImpact && <Badge color="purple" size="sm">Publication Impact</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-3">
                  <div className="text-center p-2 rounded bg-white/50">
                    <div className="text-lg font-bold text-amber-600">{signal.fieldInsights}</div>
                    <div className="text-xs text-text-muted">Field Insights</div>
                  </div>
                  <div className="text-center p-2 rounded bg-white/50">
                    <div className="text-lg font-bold text-purple-600">{signal.reviewItems}</div>
                    <div className="text-xs text-text-muted">Review Items</div>
                  </div>
                  <div className="text-center p-2 rounded bg-white/50">
                    <div className="text-lg font-bold text-teal-600">{signal.publicationImpact ? 'Yes' : 'No'}</div>
                    <div className="text-xs text-text-muted">Pub Impact</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Insight-to-Action Funnel</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {crossModuleInsightsData.insightActionFunnel.map((stage, idx) => (
              <div key={stage.stage} className="flex items-center gap-4">
                <div className="w-24 text-sm text-text-secondary">{stage.stage}</div>
                <div className="flex-1 h-8 bg-surface-elevated rounded-lg overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-end pr-3"
                    style={{ width: `${stage.conversionRate}%` }}
                  >
                    <span className="text-xs text-white font-medium">{stage.count}</span>
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-text-muted">{stage.conversionRate}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* R&D Connected Callout */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-teal-700">R&D Connected: Cross-Module Intelligence</div>
              <p className="text-sm text-teal-600 mt-1">
                This dashboard synthesizes data from Safety, Clinical, MSL, Publications, and Review workflows in real-time.
                When a hepatotoxicity signal was detected, it automatically correlated with 4 field insights, flagged 2 review items for expedited processing,
                and identified publication impact within the same hour. That's the power of connected data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: 'kpis', label: 'KPI Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'kol', label: 'KOL Analytics', icon: <Users className="w-4 h-4" /> },
          { id: 'msl', label: 'MSL Performance', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'publications', label: 'Publications', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'cross-module', label: 'Cross-Module', icon: <GitBranch className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAnalyticsTab(tab.id as typeof analyticsTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-md text-sm font-medium transition-colors ${analyticsTab === tab.id ? 'bg-surface-card text-teal-600 border-t border-x border-border' : 'text-text-muted hover:text-text-primary'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {analyticsTab === 'kpis' && renderKPIDashboard()}
      {analyticsTab === 'kol' && renderKOLAnalytics()}
      {analyticsTab === 'msl' && renderMSLAnalytics()}
      {analyticsTab === 'publications' && renderPublicationAnalytics()}
      {analyticsTab === 'cross-module' && renderCrossModuleAnalytics()}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-surface-base">
      <ScreenHeader
        title="Medical Affairs"
        subtitle="KOL engagement, publications, advisory boards, and medical information"
        icon={<Stethoscope className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), module: 'Medical Affairs' }, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = window.document.createElement('a');
              a.href = url; a.download = 'medical-affairs-export.json';
              window.document.body.appendChild(a); a.click();
              window.document.body.removeChild(a); URL.revokeObjectURL(url);
            }}><Download className="w-4 h-4 mr-1" /> Export</Button>
            <Button variant="outline" size="sm" onClick={() => setActiveView('analytics')}><BarChart3 className="w-4 h-4 mr-1" /> Analytics</Button>
          </div>
        }
      />

      <div className="border-b border-border bg-surface-card px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-fade-right">
          {[{ id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> }, { id: 'kol-management', label: 'KOL Management', icon: <Users className="w-4 h-4" /> }, { id: 'msl-activities', label: 'MSL Activities', icon: <Briefcase className="w-4 h-4" /> }, { id: 'publications', label: 'Publications', icon: <BookOpen className="w-4 h-4" /> }, { id: 'advisory-boards', label: 'Advisory Boards', icon: <UserCircle className="w-4 h-4" /> }, { id: 'congresses', label: 'Congresses', icon: <Calendar className="w-4 h-4" /> }, { id: 'medical-info', label: 'Medical Info', icon: <MessageSquare className="w-4 h-4" /> }, { id: 'medical-review', label: 'Medical Review', icon: <FileCheck className="w-4 h-4" /> }, { id: 'grants-iir', label: 'Grants & IIR', icon: <Gift className="w-4 h-4" /> }, { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id as MedAffairsView)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeView === tab.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-text-muted hover:text-text-primary'}`}>{tab.icon}<span className="hidden md:inline">{tab.label}</span></button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'kol-management' && renderKOLManagement()}
        {activeView === 'msl-activities' && renderMSLActivities()}
        {activeView === 'publications' && renderPublications()}
        {activeView === 'advisory-boards' && renderAdvisoryBoards()}
        {activeView === 'congresses' && renderCongresses()}
        {activeView === 'medical-info' && renderMedicalInfo()}
        {activeView === 'medical-review' && renderMedicalReview()}
        {activeView === 'grants-iir' && renderGrantsIIR()}
        {activeView === 'analytics' && renderAnalytics()}
      </div>

      {/* v0.21.9: Unified Modal System for all Medical Affairs actions */}
      <Modal
        isOpen={modal.type !== null}
        onClose={closeModal}
        title={getModalTitle(modal.type)}
        size="md"
      >
        <MedAffairsModalContent modal={modal} onClose={closeModal} toast={toast} />
      </Modal>
    </div>
  );
}

// v0.21.9: Modal title helper
function getModalTitle(type: MedAffairsModalType | null): string {
  const titles: Record<MedAffairsModalType, string> = {
    'add-kol': 'Add KOL Profile',
    'edit-kol': 'Edit KOL Profile',
    'log-kol-interaction': 'Log KOL Interaction',
    'email-kol': 'Email KOL',
    'add-msl': 'Add MSL',
    'view-msl-activities': 'MSL Activities',
    'view-msl-insights': 'MSL Insights',
    'view-msl-performance': 'MSL Performance',
    'log-msl-activity': 'Log MSL Activity',
    'schedule-followup': 'Schedule Follow-up',
    'add-insight': 'Add Field Insight',
    'view-safety-alert': 'Safety Alert Details',
    'brief-field-team': 'Brief Field Team',
    'filter-publications': 'Filter Publications',
    'create-publication': 'New Publication',
    'view-publication': 'Publication Details',
    'search-claims': 'Search Claims',
    'create-claim': 'New Scientific Claim',
    'view-claim': 'Claim Details',
    'add-congress': 'Add Congress',
    'manage-congress': 'Manage Congress',
    'refresh-alerts': 'Refresh Alerts',
    'acknowledge-alert': 'Acknowledge Alert',
    'resolve-alert': 'Resolve Alert',
    'plan-advisory-board': 'Plan Advisory Board',
    'view-advisory-board': 'Advisory Board Details',
    'add-congress-calendar': 'Add Congress to Calendar',
    'filter-inquiries': 'Filter Inquiries',
    'create-inquiry': 'New Medical Inquiry',
    'filter-responses': 'Filter Responses',
    'create-response': 'New Standard Response',
    'view-response': 'Response Details',
    'navigate-safety': 'Navigate to Safety',
    'open-response': 'Open Response',
    'open-inquiry': 'Open Inquiry',
    'create-grant': 'New Grant / IIR',
    'view-grant': 'Grant Details',
    'filter-reviews': 'Filter Reviews',
    'create-submission': 'New Review Submission',
    'view-review-item': 'Review Item Details',
  };
  return type ? titles[type] : '';
}

// v0.21.9: Modal content component
function MedAffairsModalContent({ modal, onClose, toast }: { modal: MedAffairsModalState; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const handleSubmit = () => {
    const actionLabels: Partial<Record<MedAffairsModalType, string>> = {
      'add-kol': 'KOL profile added',
      'log-kol-interaction': 'Interaction logged',
      'email-kol': 'Email drafted',
      'add-msl': 'MSL added',
      'log-msl-activity': 'Activity logged',
      'schedule-followup': 'Follow-up scheduled',
      'add-insight': 'Insight added',
      'brief-field-team': 'Field team briefed',
      'create-publication': 'Publication created',
      'create-claim': 'Claim created',
      'add-congress': 'Congress added',
      'plan-advisory-board': 'Advisory board planned',
      'add-congress-calendar': 'Congress added to calendar',
      'create-inquiry': 'Inquiry created',
      'create-response': 'Response created',
      'create-grant': 'Grant created',
      'create-submission': 'Submission created',
    };
    
    if (modal.type && actionLabels[modal.type]) {
      toast.success(actionLabels[modal.type]!);
    }
    onClose();
  };

  // Render different content based on modal type
  switch (modal.type) {
    case 'add-kol':
    case 'add-msl':
    case 'create-publication':
    case 'create-claim':
    case 'add-congress':
    case 'plan-advisory-board':
    case 'add-congress-calendar':
    case 'create-inquiry':
    case 'create-response':
    case 'create-grant':
    case 'create-submission':
      return (
        <div className="space-y-4">
          <p className="text-text-secondary">
            Complete the form below to create a new {modal.type?.replace(/-/g, ' ').replace('add ', '').replace('create ', '')}.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Name / Title</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Enter name or title..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Description</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" rows={3} placeholder="Enter description..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Create</Button>
          </div>
        </div>
      );

    case 'log-kol-interaction':
    case 'log-msl-activity':
    case 'schedule-followup':
    case 'add-insight':
    case 'brief-field-team':
      return (
        <div className="space-y-4">
          <p className="text-text-secondary">
            {modal.data?.kolName ? `For: ${String(modal.data.kolName)}` : null}
            {modal.data?.mslName ? `For: ${String(modal.data.mslName)}` : null}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option>Meeting</option>
                <option>Call</option>
                <option>Email</option>
                <option>Conference</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" rows={3} placeholder="Enter notes..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
              <input type="date" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Save</Button>
          </div>
        </div>
      );

    case 'email-kol':
      return (
        <div className="space-y-4">
          <p className="text-text-secondary">
            Compose email to: {modal.data?.email ? String(modal.data.email) : 'KOL'}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
              <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" placeholder="Enter subject..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Message</label>
              <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card" rows={5} placeholder="Enter message..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Send</Button>
          </div>
        </div>
      );

    case 'filter-publications':
    case 'filter-inquiries':
    case 'filter-responses':
    case 'filter-reviews':
    case 'search-claims':
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option value="">All Statuses</option>
                <option>Draft</option>
                <option>In Review</option>
                <option>Approved</option>
                <option>Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Product</label>
              <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface-card">
                <option value="">All Products</option>
                <option>Nexavant</option>
                <option>Cardiozen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date Range</label>
              <div className="flex gap-2">
                <input type="date" className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-card" />
                <input type="date" className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-card" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Clear</Button>
            <Button variant="primary" onClick={() => { toast.success('Filters applied'); onClose(); }}>Apply Filters</Button>
          </div>
        </div>
      );

    case 'view-publication':
    case 'view-claim':
    case 'view-safety-alert':
    case 'manage-congress':
    case 'view-advisory-board':
    case 'view-response':
    case 'view-grant':
    case 'view-msl-performance':
    case 'view-review-item':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-surface-elevated rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">
              {String(modal.data?.title || modal.data?.name || modal.data?.claimCode || modal.data?.responseCode || 'Details')}
            </h4>
            <p className="text-text-secondary text-sm">
              Full details and editing capabilities would be displayed here in the production version.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <span className="text-text-muted">Status:</span>
              <span className="ml-2 text-text-primary">Active</span>
            </div>
            <div>
              <span className="text-text-muted">Last Updated:</span>
              <span className="ml-2 text-text-primary">Today</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => { toast.success('Changes saved'); onClose(); }}>Edit</Button>
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4">
          <p className="text-text-secondary">Modal content for: {modal.type}</p>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      );
  }
}
