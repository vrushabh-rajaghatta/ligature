

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';
export type DensityMode = 'comfortable' | 'compact' | 'spacious';

export interface UserPreferences {
  theme: ThemeMode;
  sidebarState: SidebarState;
  density: DensityMode;
  showWelcome: boolean;
  defaultModule: string;
  dateFormat: 'US' | 'EU' | 'ISO';
  tablePageSize: number;
  enableAnimations: boolean;
  autoSaveInterval: number;
}

export interface RecentItem {
  id: string;
  type: 'program' | 'application' | 'document' | 'case' | 'signal';
  title: string;
  subtitle?: string;
  path: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

const defaultPreferences: UserPreferences = { theme: 'light', sidebarState: 'expanded', density: 'comfortable', showWelcome: true, defaultModule: 'portfolio', dateFormat: 'US', tablePageSize: 25, enableAnimations: true, autoSaveInterval: 30 };
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const timestamp = (): string => new Date().toISOString();
const MAX_RECENT_ITEMS = 20;
const MAX_NOTIFICATIONS = 50;

interface UIState {
  preferences: UserPreferences;
  currentModule: string;
  breadcrumbs: { label: string; path: string }[];
  searchQuery: string;
  isSearchOpen: boolean;
  isCommandPaletteOpen: boolean;
  recentItems: RecentItem[];
  notifications: Notification[];
  unreadCount: number;
  activeModal: string | null;
  modalData: Record<string, unknown>;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  setCurrentModule: (module: string) => void;
  setBreadcrumbs: (crumbs: { label: string; path: string }[]) => void;
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  toggleCommandPalette: () => void;
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void;
  clearRecentItems: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      currentModule: 'portfolio',
      breadcrumbs: [{ label: 'Portfolio', path: '/portfolio' }],
      searchQuery: '',
      isSearchOpen: false,
      isCommandPaletteOpen: false,
      recentItems: [],
      notifications: [],
      unreadCount: 0,
      activeModal: null,
      modalData: {},
      updatePreferences: (updates) => set((s) => ({ preferences: { ...s.preferences, ...updates } })),
      resetPreferences: () => set({ preferences: defaultPreferences }),
      setCurrentModule: (module) => set({ currentModule: module }),
      setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen, isCommandPaletteOpen: false })),
      toggleCommandPalette: () => set((s) => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen, isSearchOpen: false })),
      addRecentItem: (item) => { const newItem: RecentItem = { ...item, timestamp: timestamp() }; set((s) => { const filtered = s.recentItems.filter((r) => !(r.type === item.type && r.id === item.id)); return { recentItems: [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS) }; }); },
      clearRecentItems: () => set({ recentItems: [] }),
      addNotification: (notification) => { const n: Notification = { ...notification, id: generateId(), timestamp: timestamp(), read: false }; set((s) => ({ notifications: [n, ...s.notifications].slice(0, MAX_NOTIFICATIONS), unreadCount: s.unreadCount + 1 })); },
      markAsRead: (id) => set((s) => { const n = s.notifications.find((x) => x.id === id); if (!n || n.read) return s; return { notifications: s.notifications.map((x) => x.id === id ? { ...x, read: true } : x), unreadCount: Math.max(0, s.unreadCount - 1) }; }),
      markAllAsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 })),
      removeNotification: (id) => set((s) => { const n = s.notifications.find((x) => x.id === id); return { notifications: s.notifications.filter((x) => x.id !== id), unreadCount: n && !n.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount }; }),
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
      openModal: (modalId, data = {}) => set({ activeModal: modalId, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: {} }),
    }),
    { name: 'ligature-ui', storage: createJSONStorage(() => localStorage), version: 1, partialize: (s) => ({ preferences: s.preferences, recentItems: s.recentItems }) }
  )
);

export const usePreferences = () => useUIStore((s) => s.preferences);
export const useTheme = () => useUIStore((s) => s.preferences.theme);
export const useSidebarState = () => useUIStore((s) => s.preferences.sidebarState);
export const useRecentItems = () => useUIStore((s) => s.recentItems);
export const useNotifications = () => useUIStore((s) => s.notifications);
export const useUnreadCount = () => useUIStore((s) => s.unreadCount);
export const useActiveModal = () => useUIStore((s) => s.activeModal);
export const useModalData = () => useUIStore((s) => s.modalData);
