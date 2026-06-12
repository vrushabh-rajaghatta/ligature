
import { useState, useRef, useCallback } from 'react';
import { Database, Download, Upload, RefreshCw, Trash2, CheckCircle, AlertTriangle, Activity, Camera, Clock, Archive, Play, MoreVertical, FileJson, Sparkles, GraduationCap, Building2, Briefcase, X, Loader2 } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { useDocumentStore } from '@/stores/document-store';
import { useSafetyStore } from '@/stores/safety-store';
import { exportAllData, validateDataIntegrity, resetAllStores, clearAllData } from '@/stores/store-utils';
import { useSnapshotStore, useSnapshots, useActiveSnapshot, useLastRestore, DEMO_PRESETS, type Snapshot } from '@/store/useSnapshotStore';

const PRESET_ICONS: Record<string, React.ReactNode> = {
  '💼': <Briefcase className="w-5 h-5 text-indigo-600" />,
  '🏢': <Building2 className="w-5 h-5 text-emerald-600" />,
  '📚': <GraduationCap className="w-5 h-5 text-amber-600" />,
  '✨': <Sparkles className="w-5 h-5 text-violet-600" />,
};

// v135: Loading overlay for async operations
function LoadingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl text-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-700">{message}</p>
        <p className="text-xs text-slate-500 mt-1">Please wait...</p>
      </div>
    </div>
  );
}

function StatusMessage({ type, message, onDismiss }: { type: 'success' | 'error' | 'warning'; message: string; onDismiss: () => void }) {
  const styles = { success: 'bg-green-50 border-green-200 text-green-700', error: 'bg-red-50 border-red-200 text-red-700', warning: 'bg-amber-50 border-amber-200 text-amber-700' };
  const icons = { success: <CheckCircle className="w-4 h-4" />, error: <AlertTriangle className="w-4 h-4" />, warning: <AlertTriangle className="w-4 h-4" /> };
  return (
    <div className={`px-4 py-3 rounded-lg border flex items-center justify-between ${styles[type]}`}>
      <div className="flex items-center gap-2">{icons[type]}<span className="text-sm">{message}</span></div>
      <button onClick={onDismiss} className="hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
}

function DataOverview() {
  const programs = usePortfolioStore((s) => s.programs);
  const applications = usePortfolioStore((s) => s.applications);
  const sequences = usePortfolioStore((s) => s.sequences);
  const documents = useDocumentStore((s) => s.documents);
  const cases = useSafetyStore((s) => s.cases);
  const lastSyncedAt = usePortfolioStore((s) => s.lastSyncedAt);
  const stats = [
    { label: 'Programs', value: programs.length },
    { label: 'Applications', value: applications.length },
    { label: 'Sequences', value: sequences.length },
    { label: 'Documents', value: documents.length },
    { label: 'Safety Cases', value: cases.length },
  ];
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">Data Overview</h3>
        {lastSyncedAt && <span className="text-xs text-slate-500">Last synced: {new Date(lastSyncedAt).toLocaleString()}</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SnapshotCard({ snapshot, onRestore, onDelete, onExport, isActive }: { snapshot: Snapshot; onRestore: () => void; onDelete: () => void; onExport: () => void; isActive: boolean }) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className={`bg-white rounded-lg border p-4 ${isActive ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-900">{snapshot.name}</span>
          {isActive && <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">Active</span>}
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 hover:bg-slate-100 rounded"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                <button onClick={() => { onRestore(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Restore</button>
                <button onClick={() => { onExport(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Export</button>
                <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
      {snapshot.description && <p className="text-xs text-slate-500 mb-2">{snapshot.description}</p>}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(snapshot.createdAt).toLocaleDateString()}</span>
        <span>{Object.values(snapshot.recordCounts).reduce((a, b) => a + b, 0)} records</span>
      </div>
    </div>
  );
}

function PresetCard({ preset, onLoad }: { preset: typeof DEMO_PRESETS[0]; onLoad: () => void }) {
  return (
    <button onClick={onLoad} className="bg-white rounded-lg border border-slate-200 p-4 text-left hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-2">
        {PRESET_ICONS[preset.icon] || <Sparkles className="w-5 h-5 text-slate-400" />}
        <span className="font-medium text-slate-900">{preset.name}</span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{preset.description}</p>
    </button>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (file: File, mode: 'replace' | 'merge') => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true); else if (e.type === 'dragleave') setDragActive(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]); }, []);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Import Data</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <input ref={inputRef} type="file" accept=".json" onChange={handleChange} className="hidden" />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2 text-slate-700">
              <FileJson className="w-5 h-5 text-indigo-600" /><span className="font-medium">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-1">Drag and drop a JSON file here</p>
              <p className="text-xs text-slate-500 mb-3">or</p>
              <button onClick={() => inputRef.current?.click()} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Browse Files</button>
            </>
          )}
        </div>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Import Mode</label>
          <div className="flex gap-2">
            <button onClick={() => setMode('replace')} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border ${mode === 'replace' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Replace All</button>
            <button onClick={() => setMode('merge')} className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border ${mode === 'merge' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Merge</button>
          </div>
          <p className="text-xs text-slate-500 mt-1">{mode === 'replace' ? 'Replaces all existing data with imported data' : 'Adds new records, skips duplicates'}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={() => selectedFile && onImport(selectedFile, mode)} disabled={!selectedFile} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Import</button>
        </div>
      </div>
    </div>
  );
}

function CreateSnapshotModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description?: string) => void }) {
  const [name, setName] = useState(`Snapshot ${new Date().toLocaleDateString()}`);
  const [description, setDescription] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Create Snapshot</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter snapshot name" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none" placeholder="Describe this snapshot..." />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={() => onCreate(name, description || undefined)} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">Create Snapshot</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmText, confirmStyle, onConfirm, onCancel }: { title: string; message: string; confirmText: string; confirmStyle: 'danger' | 'warning' | 'primary'; onConfirm: () => void; onCancel: () => void }) {
  const styles = { danger: 'bg-red-600 hover:bg-red-700', warning: 'bg-amber-600 hover:bg-amber-700', primary: 'bg-indigo-600 hover:bg-indigo-700' };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${styles[confirmStyle]}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function DataManagementPanel() {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; issues: string[] } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmPreset, setShowConfirmPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'snapshots'>('presets');
  // v135: Loading states for async operations
  const [loadingOperation, setLoadingOperation] = useState<string | null>(null);

  const snapshots = useSnapshots();
  const activeSnapshotId = useSnapshotStore((s) => s.activeSnapshotId);
  const lastRestore = useLastRestore();
  const createSnapshot = useSnapshotStore((s) => s.createSnapshot);
  const deleteSnapshot = useSnapshotStore((s) => s.deleteSnapshot);
  const restoreSnapshot = useSnapshotStore((s) => s.restoreSnapshot);
  const importFromFile = useSnapshotStore((s) => s.importFromFile);
  const loadPreset = useSnapshotStore((s) => s.loadPreset);

  const handleExport = async () => {
    setLoadingOperation('Exporting data...');
    // Small delay for visual feedback on fast operations
    await new Promise(r => setTimeout(r, 300));
    const data = exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ligature-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setLoadingOperation(null);
    setStatusMessage({ type: 'success', message: 'Data exported successfully' });
  };
  const handleValidate = async () => {
    setLoadingOperation('Validating data integrity...');
    await new Promise(r => setTimeout(r, 400));
    setValidationResult(validateDataIntegrity());
    setLoadingOperation(null);
  };
  const handleReset = async () => {
    setShowConfirmReset(false);
    setLoadingOperation('Resetting to defaults...');
    await new Promise(r => setTimeout(r, 500));
    resetAllStores();
    setLoadingOperation(null);
    setStatusMessage({ type: 'success', message: 'Data reset to defaults' });
  };
  const handleClear = async () => {
    setShowConfirmClear(false);
    setLoadingOperation('Clearing all data...');
    await new Promise(r => setTimeout(r, 400));
    clearAllData();
    setLoadingOperation(null);
    setStatusMessage({ type: 'success', message: 'All data cleared' });
  };
  const handleImport = async (file: File, _mode: 'replace' | 'merge') => {
    setShowImportModal(false);
    setLoadingOperation(`Importing ${file.name}...`);
    const result = await importFromFile(file);
    setLoadingOperation(null);
    setStatusMessage({ type: result.success ? 'success' : 'error', message: result.message });
  };
  const handleCreateSnapshot = async (name: string, description?: string) => {
    setShowSnapshotModal(false);
    setLoadingOperation('Creating snapshot...');
    await new Promise(r => setTimeout(r, 300));
    createSnapshot(name, description);
    setLoadingOperation(null);
    setStatusMessage({ type: 'success', message: `Snapshot "${name}" created` });
  };
  const handleRestoreSnapshot = async (id: string) => {
    const snapshot = snapshots.find((s) => s.id === id);
    if (!snapshot) return;
    setLoadingOperation(`Restoring "${snapshot.name}"...`);
    await new Promise(r => setTimeout(r, 500));
    if (restoreSnapshot(id)) {
      setStatusMessage({ type: 'success', message: `Restored snapshot "${snapshot.name}"` });
    } else {
      setStatusMessage({ type: 'error', message: 'Failed to restore snapshot' });
    }
    setLoadingOperation(null);
  };
  const handleDeleteSnapshot = (id: string) => { const snapshot = snapshots.find((s) => s.id === id); deleteSnapshot(id); setStatusMessage({ type: 'success', message: `Deleted snapshot "${snapshot?.name}"` }); };
  const handleExportSnapshot = (id: string) => {
    const snapshot = snapshots.find((s) => s.id === id);
    if (snapshot) { const blob = new Blob([JSON.stringify(snapshot.data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ligature-${snapshot.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setStatusMessage({ type: 'success', message: `Exported snapshot "${snapshot.name}"` }); }
  };
  const handleLoadPreset = async (presetId: string) => {
    setShowConfirmPreset(null);
    const preset = DEMO_PRESETS.find((p) => p.id === presetId);
    setLoadingOperation(`Loading "${preset?.name}" preset...`);
    await new Promise(r => setTimeout(r, 600));
    if (loadPreset(presetId)) {
      setStatusMessage({ type: 'success', message: `Loaded "${preset?.name}" preset` });
    } else {
      setStatusMessage({ type: 'error', message: 'Failed to load preset' });
    }
    setLoadingOperation(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg"><Database className="w-6 h-6 text-indigo-600" /></div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Data Management</h2>
            <p className="text-sm text-slate-500">{lastRestore ? `Last restore: ${new Date(lastRestore).toLocaleString()}` : 'Manage snapshots, imports, and demo presets'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleValidate} className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"><Activity className="w-4 h-4" />Validate</button>
          <button onClick={() => setShowImportModal(true)} className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"><Upload className="w-4 h-4" />Import</button>
          <button onClick={handleExport} className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      {statusMessage && <StatusMessage {...statusMessage} onDismiss={() => setStatusMessage(null)} />}

      {validationResult && (
        <div className={`px-4 py-3 rounded-lg border ${validationResult.valid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2">
            {validationResult.valid ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Data integrity check passed</span></> : <><AlertTriangle className="w-5 h-5 text-amber-600" /><span className="font-medium text-amber-700">{validationResult.issues.length} issue(s) found</span></>}
            <button onClick={() => setValidationResult(null)} className="ml-auto hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
          {!validationResult.valid && <ul className="text-sm text-amber-600 ml-7 list-disc mt-2">{validationResult.issues.slice(0, 5).map((issue, i) => <li key={i}>{issue}</li>)}{validationResult.issues.length > 5 && <li>...and {validationResult.issues.length - 5} more</li>}</ul>}
        </div>
      )}

      <DataOverview />

      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setActiveTab('presets')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'presets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Play className="w-4 h-4 inline mr-2" />Presets</button>
          <button onClick={() => setActiveTab('snapshots')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'snapshots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}><Archive className="w-4 h-4 inline mr-2" />Snapshots ({snapshots.length})</button>
        </div>

        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DEMO_PRESETS.map((preset) => <PresetCard key={preset.id} preset={preset} onLoad={() => setShowConfirmPreset(preset.id)} />)}
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Save and restore data states for demos</p>
              <button onClick={() => setShowSnapshotModal(true)} className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-1"><Camera className="w-4 h-4" />New Snapshot</button>
            </div>
            {snapshots.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No snapshots yet</p>
                <p className="text-xs text-slate-400">Create a snapshot to save the current data state</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {snapshots.map((snapshot) => <SnapshotCard key={snapshot.id} snapshot={snapshot} isActive={activeSnapshotId === snapshot.id} onRestore={() => handleRestoreSnapshot(snapshot.id)} onDelete={() => handleDeleteSnapshot(snapshot.id)} onExport={() => handleExportSnapshot(snapshot.id)} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-medium text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => setShowConfirmReset(true)} className="px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 flex items-center gap-3 text-left transition-colors">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            <div><div className="font-medium text-slate-900">Reset to Defaults</div><div className="text-xs text-slate-500">Restore sample data</div></div>
          </button>
          <button onClick={() => setShowConfirmClear(true)} className="px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 flex items-center gap-3 text-left transition-colors">
            <Trash2 className="w-5 h-5 text-red-500" />
            <div><div className="font-medium text-slate-900">Clear All Data</div><div className="text-xs text-slate-500">Remove all records</div></div>
          </button>
        </div>
      </div>

      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
      {showSnapshotModal && <CreateSnapshotModal onClose={() => setShowSnapshotModal(false)} onCreate={handleCreateSnapshot} />}
      {showConfirmReset && <ConfirmModal title="Reset to Default Data?" message="This will replace all current data with the default sample dataset." confirmText="Reset Data" confirmStyle="warning" onConfirm={handleReset} onCancel={() => setShowConfirmReset(false)} />}
      {showConfirmClear && <ConfirmModal title="Clear All Data?" message="This will permanently delete all data. This action cannot be undone." confirmText="Clear All" confirmStyle="danger" onConfirm={handleClear} onCancel={() => setShowConfirmClear(false)} />}
      {showConfirmPreset && <ConfirmModal title={`Load "${DEMO_PRESETS.find((p) => p.id === showConfirmPreset)?.name}"?`} message="This will replace your current data with the preset data. Consider creating a snapshot first." confirmText="Load Preset" confirmStyle="primary" onConfirm={() => handleLoadPreset(showConfirmPreset)} onCancel={() => setShowConfirmPreset(null)} />}
      {/* v135: Loading overlay for async operations */}
      {loadingOperation && <LoadingOverlay message={loadingOperation} />}
    </div>
  );
}
