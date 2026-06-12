

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown, Palette, Check } from 'lucide-react';
import { useThemeStore, PRESET_THEMES } from '@/store/useThemeStore';

/**
 * Theme Mode Toggle
 * Quick access to switch between dark/light modes and preset themes
 */
export function ThemeModeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Get store state directly to avoid hydration issues
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const setTheme = useThemeStore((state) => state.setTheme);

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for current mode
  const getModeIcon = () => {
    if (!mounted) return <Palette className="w-5 h-5" />;
    switch (currentTheme?.mode) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'high-contrast':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Palette className="w-5 h-5" />;
    }
  };

  // Group themes by type
  const pharmaThemes = PRESET_THEMES.filter(t => !t.id.startsWith('ligature') && t.id !== 'high-contrast');

  const handleThemeSelect = (themeId: string) => {
    /* Theme selected */
    setTheme(themeId);
    setIsOpen(false);
  };

  if (!mounted) {
    return (
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-surface-card rounded-lg transition-colors text-text-secondary">
        <Palette className="w-5 h-5" />
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-surface-card rounded-lg transition-colors text-text-secondary hover:text-text-primary"
        title={`Theme: ${currentTheme?.name || 'Loading...'}`}
      >
        {getModeIcon()}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface-elevated border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Current Theme */}
          <div className="px-3 py-2 border-b border-border bg-surface-card/50">
            <div className="text-xs text-text-muted">Current Theme</div>
            <div className="text-sm font-medium text-text-primary flex items-center gap-2 mt-0.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: currentTheme?.colors?.accentPrimary || '#1E90FF' }}
              />
              {currentTheme?.name || 'Default'}
            </div>
          </div>

          {/* Quick Mode Switch */}
          <div className="p-2 border-b border-border">
            <div className="text-xs text-text-muted px-2 mb-1">Quick Switch</div>
            <div className="flex gap-1">
              <button
                onClick={() => handleThemeSelect('ligature-dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                  currentThemeId === 'ligature-dark'
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'hover:bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                Dark
              </button>
              <button
                onClick={() => handleThemeSelect('ligature-light')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                  currentThemeId === 'ligature-light'
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'hover:bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                Light
              </button>
              <button
                onClick={() => handleThemeSelect('high-contrast')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors ${
                  currentThemeId === 'high-contrast'
                    ? 'bg-accent-blue/20 text-accent-blue'
                    : 'hover:bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                High
              </button>
            </div>
          </div>

          {/* Pharma Presets */}
          <div className="p-2 max-h-[240px] overflow-auto">
            <div className="text-xs text-text-muted px-2 mb-1">Client Themes</div>
            <div className="space-y-0.5">
              {pharmaThemes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                    currentThemeId === theme.id
                      ? 'bg-accent-blue/20 text-accent-blue'
                      : 'hover:bg-surface-card text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: theme.colors.accentPrimary }}
                  />
                  <span className="flex-1 text-left truncate">{theme.name}</span>
                  {currentThemeId === theme.id && (
                    <Check className="w-3.5 h-3.5 text-accent-blue" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
