

import { useState, useRef } from 'react';
import {
  Palette, Sun, Moon, Eye, Building2, Upload, Download, Copy, Trash2,
  Check, X, Plus, ChevronDown, ChevronRight, Edit2, Image, RefreshCw,
  Settings, Sparkles
} from 'lucide-react';
import { useThemeStore, Theme, ThemeColors, PRESET_THEMES } from '@/store/useThemeStore';

interface ThemeSettingsPanelProps {
  onClose?: () => void;
}

type ViewMode = 'gallery' | 'customize' | 'create';

export function ThemeSettingsPanel({ onClose }: ThemeSettingsPanelProps) {
  const currentTheme = useThemeStore(s => s.currentTheme);
  const currentThemeId = useThemeStore(s => s.currentThemeId);
  const customThemes = useThemeStore(s => s.customThemes);
  const setTheme = useThemeStore(s => s.setTheme);
  const createCustomTheme = useThemeStore(s => s.createCustomTheme);
  const updateCustomTheme = useThemeStore(s => s.updateCustomTheme);
  const deleteCustomTheme = useThemeStore(s => s.deleteCustomTheme);
  const duplicateTheme = useThemeStore(s => s.duplicateTheme);
  const exportTheme = useThemeStore(s => s.exportTheme);
  const importTheme = useThemeStore(s => s.importTheme);
  const getAllThemes = useThemeStore(s => s.getAllThemes);

  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['colors']));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const allThemes = getAllThemes();
  const presetThemes = PRESET_THEMES;

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setExpandedSections(next);
  };

  const handleCreateNew = () => {
    const baseTheme = currentTheme;
    const id = createCustomTheme({
      name: 'My Custom Theme',
      description: 'A custom theme based on ' + baseTheme.name,
      mode: baseTheme.mode,
      colors: { ...baseTheme.colors },
      fonts: { ...baseTheme.fonts },
      branding: {},
    });
    const newTheme = allThemes.find(t => t.id === id) || useThemeStore.getState().getAllThemes().find(t => t.id === id);
    if (newTheme) {
      setEditingTheme(newTheme);
      setViewMode('customize');
    }
  };

  const handleDuplicate = (themeId: string) => {
    const source = allThemes.find(t => t.id === themeId);
    if (source) {
      const newId = duplicateTheme(themeId, `${source.name} (Copy)`);
      const newTheme = useThemeStore.getState().getAllThemes().find(t => t.id === newId);
      if (newTheme) {
        setEditingTheme(newTheme);
        setViewMode('customize');
      }
    }
  };

  const handleExport = (themeId: string) => {
    const json = exportTheme(themeId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${themeId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      const newId = importTheme(json);
      if (newId) {
        setTheme(newId);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingTheme) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateCustomTheme(editingTheme.id, {
        branding: { ...editingTheme.branding, logoUrl: dataUrl },
      });
      setEditingTheme({
        ...editingTheme,
        branding: { ...editingTheme.branding, logoUrl: dataUrl },
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleColorChange = (colorKey: keyof ThemeColors, value: string) => {
    if (!editingTheme) return;
    const newColors = { ...editingTheme.colors, [colorKey]: value };
    updateCustomTheme(editingTheme.id, { colors: newColors });
    setEditingTheme({ ...editingTheme, colors: newColors });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'light': return <Sun className="w-4 h-4" />;
      case 'high-contrast': return <Eye className="w-4 h-4" />;
      default: return <Palette className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-purple/20">
            <Palette className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Theme Settings</h2>
            <p className="text-sm text-text-muted">Customize appearance and branding</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {viewMode !== 'gallery' && (
            <button
              onClick={() => {
                setViewMode('gallery');
                setEditingTheme(null);
              }}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
            >
              ← Back
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'gallery' && (
          <div className="space-y-6">
            {/* Current Theme */}
            <div className="bg-surface-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Current Theme</h3>
                <span className="text-xs px-2 py-0.5 bg-accent-green/20 text-accent-green rounded-full">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0"
                     style={{ background: `linear-gradient(135deg, ${currentTheme.colors.surface} 0%, ${currentTheme.colors.surfaceElevated} 100%)` }}>
                  <div className="w-full h-2" style={{ backgroundColor: currentTheme.colors.accentPrimary }} />
                  <div className="p-2">
                    <div className="w-8 h-1 rounded mb-1" style={{ backgroundColor: currentTheme.colors.textPrimary }} />
                    <div className="w-6 h-1 rounded" style={{ backgroundColor: currentTheme.colors.textMuted }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getModeIcon(currentTheme.mode)}
                    <span className="font-medium text-text-primary">{currentTheme.name}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{currentTheme.description}</p>
                </div>
                {!currentTheme.isPreset && (
                  <button
                    onClick={() => {
                      setEditingTheme(currentTheme);
                      setViewMode('customize');
                    }}
                    className="p-2 hover:bg-surface rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-text-muted" />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
              >
                <Plus className="w-4 h-4" />
                Create Custom Theme
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>

            {/* Preset Themes */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Preset Themes</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {presetThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    isActive={currentThemeId === theme.id}
                    onSelect={() => setTheme(theme.id)}
                    onDuplicate={() => handleDuplicate(theme.id)}
                    onExport={() => handleExport(theme.id)}
                  />
                ))}
              </div>
            </div>

            {/* Custom Themes */}
            {customThemes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Custom Themes</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {customThemes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      isActive={currentThemeId === theme.id}
                      onSelect={() => setTheme(theme.id)}
                      onEdit={() => {
                        setEditingTheme(theme);
                        setViewMode('customize');
                      }}
                      onDuplicate={() => handleDuplicate(theme.id)}
                      onExport={() => handleExport(theme.id)}
                      onDelete={() => setShowDeleteConfirm(theme.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pharma Company Themes Section */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-semibold text-text-primary">Enterprise Themes</h3>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Pre-configured themes matching major pharmaceutical company brand guidelines.
                Duplicate any theme to customize further.
              </p>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                {presetThemes.filter(t => !t.id.startsWith('ligature') && t.id !== 'high-contrast').map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={`p-3 rounded-lg border transition-all ${
                      currentThemeId === theme.id
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-border hover:border-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.accentPrimary }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.colors.accentSecondary }}
                      />
                    </div>
                    <span className="text-xs font-medium text-text-primary">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'customize' && editingTheme && (
          <div className="space-y-6">
            {/* Theme Name & Description */}
            <div className="bg-surface-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Theme Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Name</label>
                  <input
                    type="text"
                    value={editingTheme.name}
                    onChange={(e) => {
                      updateCustomTheme(editingTheme.id, { name: e.target.value });
                      setEditingTheme({ ...editingTheme, name: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Description</label>
                  <input
                    type="text"
                    value={editingTheme.description}
                    onChange={(e) => {
                      updateCustomTheme(editingTheme.id, { description: e.target.value });
                      setEditingTheme({ ...editingTheme, description: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Mode</label>
                  <div className="flex gap-2">
                    {(['dark', 'light', 'high-contrast'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          updateCustomTheme(editingTheme.id, { mode });
                          setEditingTheme({ ...editingTheme, mode });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                          editingTheme.mode === mode
                            ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                            : 'border-border text-text-secondary hover:border-text-muted'
                        }`}
                      >
                        {getModeIcon(mode)}
                        <span className="capitalize">{mode.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleSection('branding')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-hover"
              >
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-text-muted" />
                  <span className="text-sm font-semibold text-text-primary">Branding</span>
                </div>
                {expandedSections.has('branding') ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
              {expandedSections.has('branding') && (
                <div className="p-4 border-t border-border space-y-4">
                  <div>
                    <label className="text-xs text-text-muted block mb-2">Logo</label>
                    <div className="flex items-center gap-4">
                      {editingTheme.branding.logoUrl ? (
                        <div className="w-24 h-12 bg-surface border border-border rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={editingTheme.branding.logoUrl}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-12 bg-surface border border-dashed border-border rounded-lg flex items-center justify-center">
                          <Image className="w-6 h-6 text-text-muted" />
                        </div>
                      )}
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="px-3 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary"
                      >
                        Upload Logo
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={editingTheme.branding.companyName || ''}
                      onChange={(e) => {
                        const branding = { ...editingTheme.branding, companyName: e.target.value };
                        updateCustomTheme(editingTheme.id, { branding });
                        setEditingTheme({ ...editingTheme, branding });
                      }}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                      placeholder="Your Company"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Tagline</label>
                    <input
                      type="text"
                      value={editingTheme.branding.tagline || ''}
                      onChange={(e) => {
                        const branding = { ...editingTheme.branding, tagline: e.target.value };
                        updateCustomTheme(editingTheme.id, { branding });
                        setEditingTheme({ ...editingTheme, branding });
                      }}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                      placeholder="Your tagline here"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-hover"
              >
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-text-muted" />
                  <span className="text-sm font-semibold text-text-primary">Colors</span>
                </div>
                {expandedSections.has('colors') ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
              {expandedSections.has('colors') && (
                <div className="p-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <ColorGroup title="Surfaces">
                      <ColorPicker label="Surface" value={editingTheme.colors.surface} onChange={(v) => handleColorChange('surface', v)} />
                      <ColorPicker label="Elevated" value={editingTheme.colors.surfaceElevated} onChange={(v) => handleColorChange('surfaceElevated', v)} />
                      <ColorPicker label="Card" value={editingTheme.colors.surfaceCard} onChange={(v) => handleColorChange('surfaceCard', v)} />
                      <ColorPicker label="Border" value={editingTheme.colors.border} onChange={(v) => handleColorChange('border', v)} />
                    </ColorGroup>
                    <ColorGroup title="Text">
                      <ColorPicker label="Primary" value={editingTheme.colors.textPrimary} onChange={(v) => handleColorChange('textPrimary', v)} />
                      <ColorPicker label="Secondary" value={editingTheme.colors.textSecondary} onChange={(v) => handleColorChange('textSecondary', v)} />
                      <ColorPicker label="Muted" value={editingTheme.colors.textMuted} onChange={(v) => handleColorChange('textMuted', v)} />
                    </ColorGroup>
                    <ColorGroup title="Accents">
                      <ColorPicker label="Primary" value={editingTheme.colors.accentPrimary} onChange={(v) => handleColorChange('accentPrimary', v)} />
                      <ColorPicker label="Secondary" value={editingTheme.colors.accentSecondary} onChange={(v) => handleColorChange('accentSecondary', v)} />
                    </ColorGroup>
                    <ColorGroup title="Status">
                      <ColorPicker label="Success" value={editingTheme.colors.accentSuccess} onChange={(v) => handleColorChange('accentSuccess', v)} />
                      <ColorPicker label="Warning" value={editingTheme.colors.accentWarning} onChange={(v) => handleColorChange('accentWarning', v)} />
                      <ColorPicker label="Error" value={editingTheme.colors.accentError} onChange={(v) => handleColorChange('accentError', v)} />
                      <ColorPicker label="Info" value={editingTheme.colors.accentInfo} onChange={(v) => handleColorChange('accentInfo', v)} />
                    </ColorGroup>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-surface-card rounded-xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Preview</h3>
              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: editingTheme.colors.surface,
                  borderColor: editingTheme.colors.border,
                }}
              >
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ backgroundColor: editingTheme.colors.surfaceElevated }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: editingTheme.colors.accentPrimary }}
                    />
                    <span style={{ color: editingTheme.colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
                      Header Title
                    </span>
                  </div>
                  <p style={{ color: editingTheme.colors.textSecondary, fontSize: '12px' }}>
                    This is secondary text describing something important.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded text-white text-sm"
                    style={{ backgroundColor: editingTheme.colors.accentPrimary }}
                  >
                    Primary Action
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-sm border"
                    style={{
                      borderColor: editingTheme.colors.border,
                      color: editingTheme.colors.textSecondary,
                    }}
                  >
                    Secondary
                  </button>
                </div>
                <div className="flex gap-3 mt-3">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: editingTheme.colors.accentSuccess + '33', color: editingTheme.colors.accentSuccess }}>Success</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: editingTheme.colors.accentWarning + '33', color: editingTheme.colors.accentWarning }}>Warning</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: editingTheme.colors.accentError + '33', color: editingTheme.colors.accentError }}>Error</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setTheme(editingTheme.id)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
              >
                <Check className="w-4 h-4" />
                Apply Theme
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(editingTheme.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(editingTheme.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Delete Theme?</h3>
            <p className="text-sm text-text-muted mb-4">
              This action cannot be undone. The theme will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteCustomTheme(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                  if (editingTheme?.id === showDeleteConfirm) {
                    setEditingTheme(null);
                    setViewMode('gallery');
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Theme Card Component
interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete?: () => void;
}

function ThemeCard({ theme, isActive, onSelect, onEdit, onDuplicate, onExport, onDelete }: ThemeCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all cursor-pointer ${
        isActive
          ? 'border-accent-blue ring-2 ring-accent-blue/30'
          : 'border-border hover:border-text-muted'
      }`}
      onClick={onSelect}
    >
      {/* Preview */}
      <div
        className="h-20 relative"
        style={{
          background: `linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceElevated} 100%)`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: theme.colors.accentPrimary }}
        />
        <div className="absolute bottom-2 left-2 right-2">
          <div
            className="w-12 h-1.5 rounded mb-1"
            style={{ backgroundColor: theme.colors.textPrimary }}
          />
          <div
            className="w-8 h-1 rounded"
            style={{ backgroundColor: theme.colors.textMuted }}
          />
        </div>
        {isActive && (
          <div className="absolute top-2 right-2">
            <Check className="w-4 h-4 text-accent-green" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-surface-card">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {theme.mode === 'dark' && <Moon className="w-3 h-3 text-text-muted" />}
              {theme.mode === 'light' && <Sun className="w-3 h-3 text-text-muted" />}
              {theme.mode === 'high-contrast' && <Eye className="w-3 h-3 text-text-muted" />}
              <span className="text-sm font-medium text-text-primary truncate">{theme.name}</span>
            </div>
            {theme.isPreset && (
              <span className="text-xs text-text-muted">Preset</span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-surface-hover rounded"
            >
              <Settings className="w-3.5 h-3.5 text-text-muted" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-6 bg-surface-elevated border border-border rounded-lg shadow-xl z-20 py-1 min-w-[120px]">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover flex items-center gap-2"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Copy className="w-3 h-3" /> Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Color Group Component
function ColorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-text-muted mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Color Picker Component
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer border-0"
      />
      <span className="text-xs text-text-secondary flex-1">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 px-2 py-1 text-xs bg-surface border border-border rounded text-text-primary font-mono"
      />
    </div>
  );
}

export default ThemeSettingsPanel;
