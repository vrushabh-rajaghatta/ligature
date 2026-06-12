

/**
 * Theme Store - Client-Brandable Theming System
 * 
 * Provides comprehensive theming with:
 * - Preset pharma company themes (Lilly, Merck, Pfizer, etc.)
 * - Custom client branding (logo, colors, fonts)
 * - Light/Dark/High-Contrast modes
 * - Persistent theme preferences
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'high-contrast';

export interface ThemeColors {
  // Surfaces
  surface: string;
  surfaceElevated: string;
  surfaceCard: string;
  surfaceHover: string;
  border: string;
  
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Accents
  accentPrimary: string;      // Main brand color
  accentSecondary: string;    // Secondary brand color
  accentSuccess: string;
  accentWarning: string;
  accentError: string;
  accentInfo: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  mono: string;
}

export interface ThemeBranding {
  logoUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
  companyName?: string;
  tagline?: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  mode: ThemeMode;
  colors: ThemeColors;
  fonts: ThemeFonts;
  branding: ThemeBranding;
  isPreset: boolean;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// PRESET THEMES
// ============================================================================

const ligatureDarkColors: ThemeColors = {
  surface: '#0D1B2A',
  surfaceElevated: '#1A2D42',
  surfaceCard: '#0f172a',
  surfaceHover: '#243B53',
  border: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accentPrimary: '#1E90FF',
  accentSecondary: '#14B8A6',
  accentSuccess: '#10B981',
  accentWarning: '#F59E0B',
  accentError: '#EF4444',
  accentInfo: '#7C3AED',
};

const ligatureLightColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  surfaceCard: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  border: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accentPrimary: '#1E90FF',
  accentSecondary: '#0D9488',
  accentSuccess: '#059669',
  accentWarning: '#D97706',
  accentError: '#DC2626',
  accentInfo: '#6D28D9',
};

const highContrastColors: ThemeColors = {
  surface: '#000000',
  surfaceElevated: '#1A1A1A',
  surfaceCard: '#0D0D0D',
  surfaceHover: '#2A2A2A',
  border: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textMuted: '#CCCCCC',
  accentPrimary: '#00FFFF',
  accentSecondary: '#FF00FF',
  accentSuccess: '#00FF00',
  accentWarning: '#FFFF00',
  accentError: '#FF0000',
  accentInfo: '#0080FF',
};

// Pharma Company Preset Themes
const lillyColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  surfaceCard: '#FAFAFA',
  surfaceHover: '#EBEBEB',
  border: '#D4D4D4',
  textPrimary: '#1F1F1F',
  textSecondary: '#525252',
  textMuted: '#8C8C8C',
  accentPrimary: '#E11931',      // Lilly Red
  accentSecondary: '#0033A0',    // Lilly Blue
  accentSuccess: '#2E7D32',
  accentWarning: '#ED6C02',
  accentError: '#D32F2F',
  accentInfo: '#0288D1',
};

const merckColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  surfaceCard: '#F1F3F5',
  surfaceHover: '#E9ECEF',
  border: '#DEE2E6',
  textPrimary: '#212529',
  textSecondary: '#495057',
  textMuted: '#868E96',
  accentPrimary: '#00857C',      // Merck Teal
  accentSecondary: '#6F2C91',    // Merck Purple
  accentSuccess: '#28A745',
  accentWarning: '#FFC107',
  accentError: '#DC3545',
  accentInfo: '#17A2B8',
};

const pfizerColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F7F9FC',
  surfaceCard: '#EEF2F7',
  surfaceHover: '#E4EAF2',
  border: '#D1D9E6',
  textPrimary: '#1E1E1E',
  textSecondary: '#4A5568',
  textMuted: '#718096',
  accentPrimary: '#0066CC',      // Pfizer Blue
  accentSecondary: '#009CDE',    // Pfizer Light Blue
  accentSuccess: '#2E7D32',
  accentWarning: '#F57C00',
  accentError: '#C62828',
  accentInfo: '#1976D2',
};

const jnjColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',
  surfaceCard: '#F5F5F5',
  surfaceHover: '#EEEEEE',
  border: '#E0E0E0',
  textPrimary: '#212121',
  textSecondary: '#616161',
  textMuted: '#9E9E9E',
  accentPrimary: '#D51900',      // J&J Red
  accentSecondary: '#1A1A1A',    // J&J Black
  accentSuccess: '#388E3C',
  accentWarning: '#F9A825',
  accentError: '#C62828',
  accentInfo: '#1976D2',
};

const rocheColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F8F8F8',
  surfaceCard: '#F0F0F0',
  surfaceHover: '#E8E8E8',
  border: '#D8D8D8',
  textPrimary: '#1C1C1C',
  textSecondary: '#4D4D4D',
  textMuted: '#808080',
  accentPrimary: '#0066A1',      // Roche Blue
  accentSecondary: '#F5821F',    // Roche Orange
  accentSuccess: '#2E7D32',
  accentWarning: '#ED6C02',
  accentError: '#C62828',
  accentInfo: '#0288D1',
};

const novartisColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',
  surfaceCard: '#F5F5F5',
  surfaceHover: '#EEEEEE',
  border: '#E0E0E0',
  textPrimary: '#1A1A1A',
  textSecondary: '#525252',
  textMuted: '#8A8A8A',
  accentPrimary: '#E3001B',      // Novartis Red
  accentSecondary: '#0460A9',    // Novartis Blue
  accentSuccess: '#2E7D32',
  accentWarning: '#ED6C02',
  accentError: '#C62828',
  accentInfo: '#1976D2',
};

const gskColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  surfaceCard: '#F1F3F5',
  surfaceHover: '#E9ECEF',
  border: '#DEE2E6',
  textPrimary: '#212529',
  textSecondary: '#495057',
  textMuted: '#868E96',
  accentPrimary: '#F36633',      // GSK Orange
  accentSecondary: '#00A3E0',    // GSK Blue
  accentSuccess: '#28A745',
  accentWarning: '#FFC107',
  accentError: '#DC3545',
  accentInfo: '#17A2B8',
};

const azColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#FAFBFC',
  surfaceCard: '#F4F5F7',
  surfaceHover: '#EBECF0',
  border: '#DFE1E6',
  textPrimary: '#172B4D',
  textSecondary: '#42526E',
  textMuted: '#6B778C',
  accentPrimary: '#830051',      // AZ Maroon
  accentSecondary: '#F0AB00',    // AZ Gold
  accentSuccess: '#36B37E',
  accentWarning: '#FFAB00',
  accentError: '#DE350B',
  accentInfo: '#0065FF',
};

const abbvieColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F9F9F9',
  surfaceCard: '#F3F3F3',
  surfaceHover: '#EDEDED',
  border: '#DDDDDD',
  textPrimary: '#1D1D1D',
  textSecondary: '#555555',
  textMuted: '#888888',
  accentPrimary: '#071D49',      // AbbVie Blue
  accentSecondary: '#F7941D',    // AbbVie Orange
  accentSuccess: '#2E7D32',
  accentWarning: '#ED6C02',
  accentError: '#C62828',
  accentInfo: '#0288D1',
};

const bmyColors: ThemeColors = {
  surface: '#FFFFFF',
  surfaceElevated: '#F8F8F8',
  surfaceCard: '#F0F0F0',
  surfaceHover: '#E8E8E8',
  border: '#D8D8D8',
  textPrimary: '#1C1C1C',
  textSecondary: '#4D4D4D',
  textMuted: '#808080',
  accentPrimary: '#BE2BBB',      // BMS Purple
  accentSecondary: '#2BAB6F',    // BMS Green
  accentSuccess: '#2E7D32',
  accentWarning: '#ED6C02',
  accentError: '#C62828',
  accentInfo: '#0288D1',
};

const defaultFonts: ThemeFonts = {
  heading: 'Inter, system-ui, sans-serif',
  body: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, Consolas, monospace',
};

export const PRESET_THEMES: Theme[] = [
  {
    id: 'ligature-dark',
    name: 'Ligature Dark',
    description: 'Default dark theme optimized for extended use',
    mode: 'dark',
    colors: ligatureDarkColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Ligature',
      tagline: 'R&D Connected Platform',
    },
    isPreset: true,
  },
  {
    id: 'ligature-light',
    name: 'Ligature Light',
    description: 'Clean light theme for bright environments',
    mode: 'light',
    colors: ligatureLightColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Ligature',
      tagline: 'R&D Connected Platform',
    },
    isPreset: true,
    isDefault: true,
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'WCAG AAA compliant for accessibility',
    mode: 'high-contrast',
    colors: highContrastColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Ligature',
      tagline: 'R&D Connected Platform',
    },
    isPreset: true,
  },
  {
    id: 'lilly',
    name: 'Eli Lilly',
    description: 'Eli Lilly and Company brand theme',
    mode: 'light',
    colors: lillyColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Eli Lilly',
      logoAlt: 'Eli Lilly and Company',
    },
    isPreset: true,
  },
  {
    id: 'merck',
    name: 'Merck',
    description: 'Merck & Co. brand theme',
    mode: 'light',
    colors: merckColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Merck',
      logoAlt: 'Merck & Co., Inc.',
    },
    isPreset: true,
  },
  {
    id: 'pfizer',
    name: 'Pfizer',
    description: 'Pfizer Inc. brand theme',
    mode: 'light',
    colors: pfizerColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Pfizer',
      logoAlt: 'Pfizer Inc.',
    },
    isPreset: true,
  },
  {
    id: 'jnj',
    name: 'Johnson & Johnson',
    description: 'Johnson & Johnson brand theme',
    mode: 'light',
    colors: jnjColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Johnson & Johnson',
      logoAlt: 'Johnson & Johnson',
    },
    isPreset: true,
  },
  {
    id: 'roche',
    name: 'Roche',
    description: 'Roche Holding AG brand theme',
    mode: 'light',
    colors: rocheColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Roche',
      logoAlt: 'Roche',
    },
    isPreset: true,
  },
  {
    id: 'novartis',
    name: 'Novartis',
    description: 'Novartis AG brand theme',
    mode: 'light',
    colors: novartisColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Novartis',
      logoAlt: 'Novartis',
    },
    isPreset: true,
  },
  {
    id: 'gsk',
    name: 'GSK',
    description: 'GlaxoSmithKline brand theme',
    mode: 'light',
    colors: gskColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'GSK',
      logoAlt: 'GlaxoSmithKline',
    },
    isPreset: true,
  },
  {
    id: 'astrazeneca',
    name: 'AstraZeneca',
    description: 'AstraZeneca PLC brand theme',
    mode: 'light',
    colors: azColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'AstraZeneca',
      logoAlt: 'AstraZeneca',
    },
    isPreset: true,
  },
  {
    id: 'abbvie',
    name: 'AbbVie',
    description: 'AbbVie Inc. brand theme',
    mode: 'light',
    colors: abbvieColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'AbbVie',
      logoAlt: 'AbbVie Inc.',
    },
    isPreset: true,
  },
  {
    id: 'bms',
    name: 'Bristol-Myers Squibb',
    description: 'Bristol-Myers Squibb brand theme',
    mode: 'light',
    colors: bmyColors,
    fonts: defaultFonts,
    branding: {
      companyName: 'Bristol-Myers Squibb',
      logoAlt: 'Bristol-Myers Squibb',
    },
    isPreset: true,
  },
];

// ============================================================================
// THEME STORE
// ============================================================================

interface ThemeState {
  // Current theme
  currentThemeId: string;
  currentTheme: Theme;
  
  // Custom themes
  customThemes: Theme[];
  
  // Actions
  setTheme: (themeId: string) => void;
  createCustomTheme: (theme: Omit<Theme, 'id' | 'isPreset' | 'createdAt' | 'updatedAt'>) => string;
  updateCustomTheme: (themeId: string, updates: Partial<Theme>) => void;
  deleteCustomTheme: (themeId: string) => void;
  duplicateTheme: (themeId: string, newName: string) => string;
  
  // Branding
  updateBranding: (themeId: string, branding: Partial<ThemeBranding>) => void;
  uploadLogo: (themeId: string, logoUrl: string) => void;
  
  // Utilities
  getThemeById: (themeId: string) => Theme | undefined;
  getAllThemes: () => Theme[];
  applyThemeToDOM: (theme: Theme) => void;
  exportTheme: (themeId: string) => string;
  importTheme: (themeJson: string) => string | null;
}

const DEFAULT_THEME = PRESET_THEMES.find(t => t.isDefault) || PRESET_THEMES[0];

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentThemeId: DEFAULT_THEME.id,
        currentTheme: DEFAULT_THEME,
        customThemes: [],
        
        // Set active theme
        setTheme: (themeId) => {
          logger.debug('ThemeStore', `setTheme called with: ${themeId}`);
          const allThemes = get().getAllThemes();
          logger.debug('ThemeStore', `allThemes count: ${allThemes.length}`);
          const theme = allThemes.find(t => t.id === themeId);
          logger.debug('ThemeStore', `found theme: ${theme?.name}`);
          if (theme) {
            set({ currentThemeId: themeId, currentTheme: theme }, false, 'setTheme');
            get().applyThemeToDOM(theme);
            logger.debug('ThemeStore', 'theme applied');
          }
        },
        
        // Create custom theme
        createCustomTheme: (themeData) => {
          const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const now = new Date().toISOString();
          const newTheme: Theme = {
            ...themeData,
            id,
            isPreset: false,
            createdAt: now,
            updatedAt: now,
          };
          
          set((state) => ({
            customThemes: [...state.customThemes, newTheme],
          }), false, 'createCustomTheme');
          
          return id;
        },
        
        // Update custom theme
        updateCustomTheme: (themeId, updates) => {
          set((state) => ({
            customThemes: state.customThemes.map(t =>
              t.id === themeId
                ? { ...t, ...updates, updatedAt: new Date().toISOString() }
                : t
            ),
            // Update current theme if it's the one being edited
            currentTheme: state.currentThemeId === themeId
              ? { ...state.currentTheme, ...updates, updatedAt: new Date().toISOString() }
              : state.currentTheme,
          }), false, 'updateCustomTheme');
          
          // Re-apply if current
          const state = get();
          if (state.currentThemeId === themeId) {
            state.applyThemeToDOM(state.currentTheme);
          }
        },
        
        // Delete custom theme
        deleteCustomTheme: (themeId) => {
          const state = get();
          // Can't delete preset themes
          const theme = state.customThemes.find(t => t.id === themeId);
          if (!theme) return;
          
          // Switch to default if deleting current theme
          if (state.currentThemeId === themeId) {
            get().setTheme(DEFAULT_THEME.id);
          }
          
          set((state) => ({
            customThemes: state.customThemes.filter(t => t.id !== themeId),
          }), false, 'deleteCustomTheme');
        },
        
        // Duplicate theme
        duplicateTheme: (themeId, newName) => {
          const allThemes = get().getAllThemes();
          const source = allThemes.find(t => t.id === themeId);
          if (!source) return '';
          
          return get().createCustomTheme({
            name: newName,
            description: `Copy of ${source.name}`,
            mode: source.mode,
            colors: { ...source.colors },
            fonts: { ...source.fonts },
            branding: { ...source.branding },
          });
        },
        
        // Update branding
        updateBranding: (themeId, branding) => {
          const theme = get().getThemeById(themeId);
          if (!theme || theme.isPreset) return;
          
          get().updateCustomTheme(themeId, {
            branding: { ...theme.branding, ...branding },
          });
        },
        
        // Upload logo
        uploadLogo: (themeId, logoUrl) => {
          get().updateBranding(themeId, { logoUrl });
        },
        
        // Get theme by ID
        getThemeById: (themeId) => {
          return get().getAllThemes().find(t => t.id === themeId);
        },
        
        // Get all themes
        getAllThemes: () => {
          return [...PRESET_THEMES, ...get().customThemes];
        },
        
        // Apply theme to DOM (CSS variables + theme class)
        applyThemeToDOM: (theme) => {
          logger.debug('ThemeStore', `applyThemeToDOM: ${theme.name} (${theme.mode})`);
          const root = document.documentElement;
          const { colors, fonts } = theme;

          // 1. Stamp the mode class first — CSS :root overrides will apply immediately.
          //    This is especially important for the Ligature built-in dark/light themes
          //    where the CSS class alone provides the correct variables.
          root.classList.remove('theme-dark', 'theme-light', 'theme-high-contrast');
          root.classList.add(`theme-${theme.mode}`);

          // 2. Override individual CSS variables for pharma/custom themes whose colors
          //    differ from the built-in palette (e.g. Pfizer Blue, GSK Orange, etc.)
          root.style.setProperty('--surface', colors.surface);
          root.style.setProperty('--surface-elevated', colors.surfaceElevated);
          root.style.setProperty('--surface-card', colors.surfaceCard);
          root.style.setProperty('--surface-hover', colors.surfaceHover);
          root.style.setProperty('--border', colors.border);
          root.style.setProperty('--text-primary', colors.textPrimary);
          root.style.setProperty('--text-secondary', colors.textSecondary);
          root.style.setProperty('--text-muted', colors.textMuted);

          // Accent tokens — keep both aliased names in sync
          root.style.setProperty('--accent-primary', colors.accentPrimary);
          root.style.setProperty('--accent-secondary', colors.accentSecondary);
          root.style.setProperty('--accent-blue', colors.accentPrimary);
          root.style.setProperty('--accent-teal', colors.accentSecondary);
          root.style.setProperty('--accent-green', colors.accentSuccess);
          root.style.setProperty('--accent-amber', colors.accentWarning);
          root.style.setProperty('--accent-red', colors.accentError);
          root.style.setProperty('--accent-purple', colors.accentInfo);

          // Status semantic tokens (previously missing — caused wrong colors in light mode)
          root.style.setProperty('--status-success', colors.accentSuccess);
          root.style.setProperty('--status-warning', colors.accentWarning);
          root.style.setProperty('--status-error', colors.accentError);
          root.style.setProperty('--status-info', colors.accentPrimary);
          root.style.setProperty('--status-pending', colors.accentInfo);
          root.style.setProperty('--status-neutral', colors.textMuted);

          // Font tokens
          root.style.setProperty('--font-heading', fonts.heading);
          root.style.setProperty('--font-body', fonts.body);
          root.style.setProperty('--font-mono', fonts.mono);

          // 3. Body background — driven by CSS for built-in themes, but we also set
          //    inline so pharma themes with non-standard surfaces render correctly.
          document.body.style.removeProperty('background');
          document.body.style.removeProperty('color');
          // For pharma/custom light themes we need to set the background explicitly
          // since their surface colors differ from the CSS :root defaults.
          if (theme.mode === 'dark') {
            document.body.style.background = `linear-gradient(135deg, ${colors.surface} 0%, ${colors.surfaceElevated} 100%)`;
          } else if (theme.mode === 'high-contrast') {
            document.body.style.background = colors.surface;
          } else if (!theme.id.startsWith('ligature-')) {
            // Pharma/custom light theme — override the CSS default white
            document.body.style.background = colors.surface;
          }
          document.body.style.color = colors.textPrimary;

          // 4. Unlock CSS transitions (in case the page was rendered without them)
          root.setAttribute('data-theme-ready', '1');
        },
        
        // Export theme
        exportTheme: (themeId) => {
          const theme = get().getThemeById(themeId);
          if (!theme) return '';
          return JSON.stringify(theme, null, 2);
        },
        
        // Import theme
        importTheme: (themeJson) => {
          try {
            const parsed = JSON.parse(themeJson);
            // Validate required fields
            if (!parsed.name || !parsed.colors || !parsed.mode) {
              return null;
            }
            return get().createCustomTheme({
              name: parsed.name,
              description: parsed.description || 'Imported theme',
              mode: parsed.mode,
              colors: parsed.colors,
              fonts: parsed.fonts || defaultFonts,
              branding: parsed.branding || {},
            });
          } catch {
            return null;
          }
        },
      }),
      {
        name: 'ligature-theme',
        partialize: (state) => ({
          currentThemeId: state.currentThemeId,
          customThemes: state.customThemes,
        }),
        onRehydrateStorage: () => (state) => {
          // After rehydration, restore the current theme object and sync CSS variables.
          // The anti-FOUC script in layout.tsx already applied the correct theme CLASS,
          // so we only need to set the per-theme CSS variable overrides (especially for
          // pharma/custom themes whose colors differ from the CSS class defaults).
          if (state) {
            const allThemes = [...PRESET_THEMES, ...state.customThemes];
            const theme = allThemes.find(t => t.id === state.currentThemeId) || DEFAULT_THEME;
            state.currentTheme = theme;
            // Use requestAnimationFrame so we're after the first paint (DOM guaranteed ready).
            // The anti-FOUC script already painted the right colours; this call syncs inline
            // CSS variable overrides for custom/pharma themes.
            requestAnimationFrame(() => {
              state.applyThemeToDOM(theme);
            });
          }
        },
      }
    ),
    { name: 'ThemeStore' }
  )
);
