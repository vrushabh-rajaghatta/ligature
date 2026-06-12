
/**
 * Template Marketplace Service
 * Share and discover notification templates across teams
 * 
 * v0.42.5 - Template Marketplace
 * 
 * Features:
 * - Template publishing and discovery
 * - Rating and reviews
 * - Version management
 * - Team/organization sharing
 */

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type ChannelType = 'slack' | 'teams' | 'discord' | 'webhook';
export type TemplateCategory = 
  | 'alerts'
  | 'notifications'
  | 'reports'
  | 'workflows'
  | 'integrations'
  | 'custom';

export type VisibilityLevel = 'private' | 'team' | 'organization' | 'public';

export interface TemplateAuthor {
  id: string;
  name: string;
  avatar?: string;
  organization?: string;
  verified: boolean;
}

export interface TemplateVersion {
  version: string;
  publishedAt: number;
  changelog: string;
  templateData: string;  // JSON stringified template
  downloads: number;
}

export interface TemplateReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;  // 1-5
  comment: string;
  createdAt: number;
  helpful: number;
  reported: boolean;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  channelType: ChannelType;
  category: TemplateCategory;
  tags: string[];
  author: TemplateAuthor;
  visibility: VisibilityLevel;
  
  // Version info
  currentVersion: string;
  versions: TemplateVersion[];
  
  // Stats
  downloads: number;
  rating: number;
  reviewCount: number;
  favorites: number;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  featured: boolean;
  verified: boolean;
  
  // Preview
  previewImage?: string;
  previewData?: Record<string, unknown>;
  
  // Dependencies
  requiredVariables: string[];
  optionalVariables: string[];
}

export interface TemplateInstallation {
  templateId: string;
  installedVersion: string;
  installedAt: number;
  channelBindings: string[];  // Channel IDs using this template
  customizations: Record<string, unknown>;
}

export interface MarketplaceStats {
  totalTemplates: number;
  totalDownloads: number;
  totalAuthors: number;
  templatesByCategory: Record<TemplateCategory, number>;
  templatesByChannel: Record<ChannelType, number>;
  topTemplates: MarketplaceTemplate[];
  recentTemplates: MarketplaceTemplate[];
}

export interface SearchFilters {
  query?: string;
  channelType?: ChannelType;
  category?: TemplateCategory;
  tags?: string[];
  author?: string;
  minRating?: number;
  verified?: boolean;
  featured?: boolean;
  sortBy?: 'downloads' | 'rating' | 'recent' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  templates: MarketplaceTemplate[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_AUTHORS: TemplateAuthor[] = [
  { id: 'author-1', name: 'Ligature Team', verified: true, organization: 'Ligature' },
  { id: 'author-2', name: 'DevOps Pro', verified: true },
  { id: 'author-3', name: 'CloudWatcher', verified: false },
  { id: 'author-4', name: 'AlertMaster', verified: true },
];

const MOCK_TEMPLATES: MarketplaceTemplate[] = [
  {
    id: 'tmpl-001',
    name: 'Critical Alert - Slack',
    description: 'Eye-catching critical alert template with severity indicators',
    longDescription: 'A professional critical alert template designed for immediate attention. Features red color coding, clear severity indicators, and action buttons for quick response.',
    channelType: 'slack',
    category: 'alerts',
    tags: ['critical', 'alert', 'incident', 'urgent'],
    author: MOCK_AUTHORS[0],
    visibility: 'public',
    currentVersion: '2.1.0',
    versions: [
      { version: '2.1.0', publishedAt: Date.now() - 86400000, changelog: 'Added dark mode support', templateData: '{}', downloads: 150 },
      { version: '2.0.0', publishedAt: Date.now() - 604800000, changelog: 'Major redesign', templateData: '{}', downloads: 500 },
      { version: '1.0.0', publishedAt: Date.now() - 2592000000, changelog: 'Initial release', templateData: '{}', downloads: 350 },
    ],
    downloads: 1000,
    rating: 4.8,
    reviewCount: 45,
    favorites: 234,
    createdAt: Date.now() - 2592000000,
    updatedAt: Date.now() - 86400000,
    featured: true,
    verified: true,
    requiredVariables: ['title', 'message', 'severity'],
    optionalVariables: ['actionUrl', 'assignee', 'timestamp'],
  },
  {
    id: 'tmpl-002',
    name: 'Daily Report - Teams',
    description: 'Clean daily summary report for Microsoft Teams',
    channelType: 'teams',
    category: 'reports',
    tags: ['report', 'daily', 'summary', 'metrics'],
    author: MOCK_AUTHORS[1],
    visibility: 'public',
    currentVersion: '1.5.0',
    versions: [
      { version: '1.5.0', publishedAt: Date.now() - 172800000, changelog: 'Added charts support', templateData: '{}', downloads: 80 },
      { version: '1.0.0', publishedAt: Date.now() - 1296000000, changelog: 'Initial release', templateData: '{}', downloads: 220 },
    ],
    downloads: 300,
    rating: 4.5,
    reviewCount: 22,
    favorites: 89,
    createdAt: Date.now() - 1296000000,
    updatedAt: Date.now() - 172800000,
    featured: false,
    verified: true,
    requiredVariables: ['reportDate', 'metrics'],
    optionalVariables: ['highlights', 'issues', 'nextSteps'],
  },
  {
    id: 'tmpl-003',
    name: 'Deployment Notification - Discord',
    description: 'Colorful deployment status notification for Discord',
    channelType: 'discord',
    category: 'workflows',
    tags: ['deployment', 'ci-cd', 'devops', 'status'],
    author: MOCK_AUTHORS[2],
    visibility: 'public',
    currentVersion: '1.2.0',
    versions: [
      { version: '1.2.0', publishedAt: Date.now() - 259200000, changelog: 'Added rollback info', templateData: '{}', downloads: 45 },
    ],
    downloads: 156,
    rating: 4.2,
    reviewCount: 12,
    favorites: 43,
    createdAt: Date.now() - 864000000,
    updatedAt: Date.now() - 259200000,
    featured: false,
    verified: false,
    requiredVariables: ['environment', 'version', 'status'],
    optionalVariables: ['commit', 'duration', 'triggeredBy'],
  },
  {
    id: 'tmpl-004',
    name: 'API Webhook - JSON',
    description: 'Structured JSON payload for API integrations',
    channelType: 'webhook',
    category: 'integrations',
    tags: ['api', 'json', 'webhook', 'integration'],
    author: MOCK_AUTHORS[3],
    visibility: 'public',
    currentVersion: '3.0.0',
    versions: [
      { version: '3.0.0', publishedAt: Date.now() - 432000000, changelog: 'Added nested object support', templateData: '{}', downloads: 200 },
    ],
    downloads: 520,
    rating: 4.7,
    reviewCount: 31,
    favorites: 112,
    createdAt: Date.now() - 1728000000,
    updatedAt: Date.now() - 432000000,
    featured: true,
    verified: true,
    requiredVariables: ['event', 'payload'],
    optionalVariables: ['metadata', 'correlationId'],
  },
  {
    id: 'tmpl-005',
    name: 'SLA Breach Warning - Slack',
    description: 'SLA breach warning with countdown timer',
    channelType: 'slack',
    category: 'alerts',
    tags: ['sla', 'breach', 'warning', 'time-sensitive'],
    author: MOCK_AUTHORS[0],
    visibility: 'public',
    currentVersion: '1.0.0',
    versions: [
      { version: '1.0.0', publishedAt: Date.now() - 604800000, changelog: 'Initial release', templateData: '{}', downloads: 89 },
    ],
    downloads: 89,
    rating: 4.6,
    reviewCount: 8,
    favorites: 34,
    createdAt: Date.now() - 604800000,
    updatedAt: Date.now() - 604800000,
    featured: false,
    verified: true,
    requiredVariables: ['service', 'slaTarget', 'currentValue', 'breachTime'],
    optionalVariables: ['owner', 'escalationPath'],
  },
  {
    id: 'tmpl-006',
    name: 'Incident Update - Teams',
    description: 'Structured incident update with status timeline',
    channelType: 'teams',
    category: 'alerts',
    tags: ['incident', 'update', 'status', 'timeline'],
    author: MOCK_AUTHORS[1],
    visibility: 'public',
    currentVersion: '2.0.0',
    versions: [
      { version: '2.0.0', publishedAt: Date.now() - 345600000, changelog: 'Added timeline view', templateData: '{}', downloads: 120 },
    ],
    downloads: 245,
    rating: 4.4,
    reviewCount: 18,
    favorites: 67,
    createdAt: Date.now() - 1123200000,
    updatedAt: Date.now() - 345600000,
    featured: false,
    verified: true,
    requiredVariables: ['incidentId', 'title', 'status', 'updates'],
    optionalVariables: ['eta', 'impactedServices', 'commander'],
  },
];

// =============================================================================
// TEMPLATE MARKETPLACE SERVICE
// =============================================================================

class TemplateMarketplaceService {
  private templates: Map<string, MarketplaceTemplate> = new Map();
  private reviews: Map<string, TemplateReview[]> = new Map();
  private installations: Map<string, TemplateInstallation> = new Map();
  private favorites: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.initializeMockData();
    this.loadFromStorage();
  }

  private initializeMockData(): void {
    for (const template of MOCK_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  // ---------------------------------------------------------------------------
  // SEARCH & DISCOVERY
  // ---------------------------------------------------------------------------

  search(filters: SearchFilters = {}): SearchResult {
    let results = Array.from(this.templates.values());

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.channelType) {
      results = results.filter(t => t.channelType === filters.channelType);
    }

    if (filters.category) {
      results = results.filter(t => t.category === filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters.author) {
      results = results.filter(t => t.author.id === filters.author);
    }

    if (filters.minRating !== undefined) {
      results = results.filter(t => t.rating >= filters.minRating!);
    }

    if (filters.verified !== undefined) {
      results = results.filter(t => t.verified === filters.verified);
    }

    if (filters.featured !== undefined) {
      results = results.filter(t => t.featured === filters.featured);
    }

    // Sort
    const sortBy = filters.sortBy || 'downloads';
    const sortOrder = filters.sortOrder || 'desc';

    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'recent':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Paginate
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 12;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = results.slice(start, end);

    return {
      templates: paginatedResults,
      total: results.length,
      page,
      pageSize,
      hasMore: end < results.length,
    };
  }

  getTemplate(id: string): MarketplaceTemplate | undefined {
    return this.templates.get(id);
  }

  getFeatured(): MarketplaceTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.featured)
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 6);
  }

  getPopular(): MarketplaceTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 12);
  }

  getRecent(): MarketplaceTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12);
  }

  getByAuthor(authorId: string): MarketplaceTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.author.id === authorId);
  }

  getCategories(): { category: TemplateCategory; count: number }[] {
    const counts = new Map<TemplateCategory, number>();
    
    for (const template of Array.from(Array.from(Array.from(Array.from(Array.from(this.templates.values())))))) {
      const count = counts.get(template.category) || 0;
      counts.set(template.category, count + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  getTags(): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    
    for (const template of Array.from(Array.from(Array.from(Array.from(Array.from(this.templates.values())))))) {
      for (const tag of template.tags) {
        const count = counts.get(tag) || 0;
        counts.set(tag, count + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  getStats(): MarketplaceStats {
    const templates = Array.from(this.templates.values());
    const authors = new Set(templates.map(t => t.author.id));

    const templatesByCategory: Record<TemplateCategory, number> = {
      alerts: 0,
      notifications: 0,
      reports: 0,
      workflows: 0,
      integrations: 0,
      custom: 0,
    };

    const templatesByChannel: Record<ChannelType, number> = {
      slack: 0,
      teams: 0,
      discord: 0,
      webhook: 0,
    };

    let totalDownloads = 0;
    for (const template of templates) {
      totalDownloads += template.downloads;
      templatesByCategory[template.category]++;
      templatesByChannel[template.channelType]++;
    }

    return {
      totalTemplates: templates.length,
      totalDownloads,
      totalAuthors: authors.size,
      templatesByCategory,
      templatesByChannel,
      topTemplates: this.getPopular().slice(0, 5),
      recentTemplates: this.getRecent().slice(0, 5),
    };
  }

  // ---------------------------------------------------------------------------
  // INSTALLATION
  // ---------------------------------------------------------------------------

  install(templateId: string, version?: string): TemplateInstallation | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const installVersion = version || template.currentVersion;
    const versionInfo = template.versions.find(v => v.version === installVersion);
    if (!versionInfo) return null;

    // Update download count
    template.downloads++;
    versionInfo.downloads++;

    const installation: TemplateInstallation = {
      templateId,
      installedVersion: installVersion,
      installedAt: Date.now(),
      channelBindings: [],
      customizations: {},
    };

    this.installations.set(templateId, installation);
    this.saveToStorage();
    this.notifyListeners();

    return installation;
  }

  uninstall(templateId: string): boolean {
    const result = this.installations.delete(templateId);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  getInstallation(templateId: string): TemplateInstallation | undefined {
    return this.installations.get(templateId);
  }

  getInstalledTemplates(): MarketplaceTemplate[] {
    const installed: MarketplaceTemplate[] = [];
    
    for (const [id] of Array.from(Array.from(Array.from(Array.from(Array.from(this.installations.entries())))))) {
      const template = this.templates.get(id);
      if (template) {
        installed.push(template);
      }
    }

    return installed;
  }

  isInstalled(templateId: string): boolean {
    return this.installations.has(templateId);
  }

  hasUpdate(templateId: string): boolean {
    const installation = this.installations.get(templateId);
    const template = this.templates.get(templateId);
    
    if (!installation || !template) return false;
    return installation.installedVersion !== template.currentVersion;
  }

  // ---------------------------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------------------------

  toggleFavorite(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template) return false;

    if (this.favorites.has(templateId)) {
      this.favorites.delete(templateId);
      template.favorites = Math.max(0, template.favorites - 1);
    } else {
      this.favorites.add(templateId);
      template.favorites++;
    }

    this.saveToStorage();
    this.notifyListeners();
    return this.favorites.has(templateId);
  }

  isFavorite(templateId: string): boolean {
    return this.favorites.has(templateId);
  }

  getFavorites(): MarketplaceTemplate[] {
    const favorited: MarketplaceTemplate[] = [];
    
    for (const id of Array.from(this.favorites)) {
      const template = this.templates.get(id);
      if (template) {
        favorited.push(template);
      }
    }

    return favorited;
  }

  // ---------------------------------------------------------------------------
  // REVIEWS
  // ---------------------------------------------------------------------------

  getReviews(templateId: string): TemplateReview[] {
    return this.reviews.get(templateId) || [];
  }

  addReview(
    templateId: string,
    userId: string,
    userName: string,
    rating: number,
    comment: string
  ): TemplateReview | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const review: TemplateReview = {
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      rating: Math.min(5, Math.max(1, rating)),
      comment,
      createdAt: Date.now(),
      helpful: 0,
      reported: false,
    };

    const templateReviews = this.reviews.get(templateId) || [];
    templateReviews.unshift(review);
    this.reviews.set(templateId, templateReviews);

    // Update template rating
    const allRatings = templateReviews.map(r => r.rating);
    template.rating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
    template.reviewCount = templateReviews.length;

    this.notifyListeners();
    return review;
  }

  markReviewHelpful(templateId: string, reviewId: string): void {
    const templateReviews = this.reviews.get(templateId);
    if (!templateReviews) return;

    const review = templateReviews.find(r => r.id === reviewId);
    if (review) {
      review.helpful++;
      this.notifyListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLISHING
  // ---------------------------------------------------------------------------

  publish(
    template: Omit<MarketplaceTemplate, 'id' | 'downloads' | 'rating' | 'reviewCount' | 'favorites' | 'createdAt' | 'updatedAt' | 'versions'>,
    templateData: string
  ): MarketplaceTemplate {
    const newTemplate: MarketplaceTemplate = {
      ...template,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      downloads: 0,
      rating: 0,
      reviewCount: 0,
      favorites: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          version: template.currentVersion,
          publishedAt: Date.now(),
          changelog: 'Initial release',
          templateData,
          downloads: 0,
        },
      ],
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.notifyListeners();
    return newTemplate;
  }

  publishVersion(
    templateId: string,
    version: string,
    changelog: string,
    templateData: string
  ): TemplateVersion | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const newVersion: TemplateVersion = {
      version,
      publishedAt: Date.now(),
      changelog,
      templateData,
      downloads: 0,
    };

    template.versions.unshift(newVersion);
    template.currentVersion = version;
    template.updatedAt = Date.now();

    this.notifyListeners();
    return newVersion;
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ligature:template-marketplace');
      if (stored) {
        const data = JSON.parse(stored);
        this.installations = new Map(data.installations || []);
        this.favorites = new Set(data.favorites || []);
      }
    } catch (error) {
      console.warn('Failed to load marketplace data:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        installations: Array.from(this.installations.entries()),
        favorites: Array.from(this.favorites),
      };
      localStorage.setItem('ligature:template-marketplace', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save marketplace data:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }
}

// Singleton instance
export const templateMarketplaceService = new TemplateMarketplaceService();

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useTemplateMarketplace() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [featured, setFeatured] = useState<MarketplaceTemplate[]>([]);
  const [popular, setPopular] = useState<MarketplaceTemplate[]>([]);
  const [recent, setRecent] = useState<MarketplaceTemplate[]>([]);

  useEffect(() => {
    const update = () => {
      setStats(templateMarketplaceService.getStats());
      setFeatured(templateMarketplaceService.getFeatured());
      setPopular(templateMarketplaceService.getPopular());
      setRecent(templateMarketplaceService.getRecent());
    };

    update();
    return templateMarketplaceService.subscribe(update);
  }, []);

  return { stats, featured, popular, recent };
}

export function useTemplateSearch(initialFilters?: SearchFilters) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {});
  const [results, setResults] = useState<SearchResult>({
    templates: [],
    total: 0,
    page: 1,
    pageSize: 12,
    hasMore: false,
  });

  useEffect(() => {
    setResults(templateMarketplaceService.search(filters));
  }, [filters]);

  const search = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...updates, page: 1 }));
  }, []);

  const nextPage = useCallback(() => {
    if (results.hasMore) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }));
    }
  }, [results.hasMore]);

  const prevPage = useCallback(() => {
    if ((filters.page || 1) > 1) {
      setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }));
    }
  }, [filters.page]);

  return {
    filters,
    results,
    search,
    updateFilters,
    nextPage,
    prevPage,
    categories: templateMarketplaceService.getCategories(),
    tags: templateMarketplaceService.getTags(),
  };
}

export function useTemplateDetails(templateId: string) {
  const [template, setTemplate] = useState<MarketplaceTemplate | undefined>();
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    const update = () => {
      setTemplate(templateMarketplaceService.getTemplate(templateId));
      setReviews(templateMarketplaceService.getReviews(templateId));
      setIsInstalled(templateMarketplaceService.isInstalled(templateId));
      setIsFavorite(templateMarketplaceService.isFavorite(templateId));
      setHasUpdate(templateMarketplaceService.hasUpdate(templateId));
    };

    update();
    return templateMarketplaceService.subscribe(update);
  }, [templateId]);

  const install = useCallback((version?: string) => {
    return templateMarketplaceService.install(templateId, version);
  }, [templateId]);

  const uninstall = useCallback(() => {
    return templateMarketplaceService.uninstall(templateId);
  }, [templateId]);

  const toggleFavorite = useCallback(() => {
    return templateMarketplaceService.toggleFavorite(templateId);
  }, [templateId]);

  const addReview = useCallback((userId: string, userName: string, rating: number, comment: string) => {
    return templateMarketplaceService.addReview(templateId, userId, userName, rating, comment);
  }, [templateId]);

  return {
    template,
    reviews,
    isInstalled,
    isFavorite,
    hasUpdate,
    install,
    uninstall,
    toggleFavorite,
    addReview,
  };
}

export function useInstalledTemplates() {
  const [installed, setInstalled] = useState<MarketplaceTemplate[]>([]);
  const [favorites, setFavorites] = useState<MarketplaceTemplate[]>([]);

  useEffect(() => {
    const update = () => {
      setInstalled(templateMarketplaceService.getInstalledTemplates());
      setFavorites(templateMarketplaceService.getFavorites());
    };

    update();
    return templateMarketplaceService.subscribe(update);
  }, []);

  const getInstallation = useCallback((templateId: string) => {
    return templateMarketplaceService.getInstallation(templateId);
  }, []);

  return { installed, favorites, getInstallation };
}
