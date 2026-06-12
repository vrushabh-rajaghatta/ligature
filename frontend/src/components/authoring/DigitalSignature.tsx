

import { useState } from 'react';
import { Shield, Lock, X, User, FileText, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuthoringDocument } from '@/types/authoring';

interface DigitalSignatureProps {
  document: AuthoringDocument;
  action: 'approve' | 'reject' | 'acknowledge';
  onClose: () => void;
  onSign: (signature: SignatureData) => void;
}

interface SignatureData {
  signerId: string;
  signerName: string;
  signerRole: string;
  action: 'approve' | 'reject' | 'acknowledge';
  meaning: string;
  timestamp: string;
  documentId: string;
  documentVersion: string;
  reason?: string;
}

const actionConfig = {
  approve: { label: 'Approve Document', meaning: 'I have reviewed this document and approve it for the next stage.', color: 'accent-green' },
  reject: { label: 'Reject Document', meaning: 'I have reviewed this document and it requires revision before approval.', color: 'red-400' },
  acknowledge: { label: 'Acknowledge Review', meaning: 'I acknowledge that I have reviewed this document.', color: 'accent-blue' },
};

export function DigitalSignature({ document, action, onClose, onSign }: DigitalSignatureProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const config = actionConfig[action];
  const currentUser = { id: 'u-reg-lead', name: 'Amanda Foster', role: 'Regulatory Lead', email: 'amanda.foster@ligature.com' };

  const handleSign = async () => {
    setError('');
    if (!username || !password) { setError('Please enter your username and password'); return; }
    if (!agreed) { setError('Please confirm you understand the meaning of this signature'); return; }
    if (action === 'reject' && !reason) { setError('Please provide a reason for rejection'); return; }

    setIsValidating(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (username.toLowerCase() !== 'afoster' || password !== 'demo123') {
      setError('Invalid credentials. Please check your username and password.');
      setIsValidating(false);
      return;
    }

    const signature: SignatureData = {
      signerId: currentUser.id, signerName: currentUser.name, signerRole: currentUser.role,
      action, meaning: config.meaning, timestamp: new Date().toISOString(),
      documentId: document.id, documentVersion: document.version,
      reason: action === 'reject' ? reason : undefined,
    };
    setIsValidating(false);
    onSign(signature);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[500px] shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${action === 'approve' ? 'bg-accent-green/20' : action === 'reject' ? 'bg-red-500/20' : 'bg-accent-blue/20'}`}>
              <Shield className={`w-5 h-5 ${action === 'approve' ? 'text-accent-green' : action === 'reject' ? 'text-red-400' : 'text-accent-blue'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Electronic Signature</h2>
              <p className="text-sm text-text-muted">21 CFR Part 11 Compliant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-3 bg-surface-card rounded-lg border border-border flex items-start gap-3">
            <FileText className="w-5 h-5 text-text-muted mt-0.5" />
            <div>
              <div className="text-sm font-medium text-text-primary">{document.title}</div>
              <div className="text-xs text-text-muted">Version {document.version}</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${action === 'approve' ? 'bg-accent-green/5 border-accent-green/30' : action === 'reject' ? 'bg-red-500/5 border-red-500/30' : 'bg-accent-blue/5 border-accent-blue/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className={`w-5 h-5 ${action === 'approve' ? 'text-accent-green' : action === 'reject' ? 'text-red-400' : 'text-accent-blue'}`} />
              <span className="text-sm font-semibold text-text-primary">{config.label}</span>
            </div>
            <p className="text-xs text-text-secondary">{config.meaning}</p>
          </div>

          {action === 'reject' && (
            <div>
              <label className="text-sm font-medium text-text-primary mb-2 block">Reason *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection..." className="w-full h-16 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none" />
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
            <div className="w-9 h-9 rounded-full bg-accent-blue/20 flex items-center justify-center"><User className="w-4 h-4 text-accent-blue" /></div>
            <div>
              <div className="text-sm font-medium text-text-primary">{currentUser.name}</div>
              <div className="text-xs text-text-muted">{currentUser.role}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full pl-10 pr-10 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <label htmlFor="agree" className="text-xs text-text-secondary cursor-pointer">
              I understand this electronic signature is legally binding under 21 CFR Part 11.
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
          <button onClick={handleSign} disabled={isValidating} className={`px-6 py-2 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 ${action === 'approve' ? 'bg-accent-green hover:bg-accent-green/90' : action === 'reject' ? 'bg-red-500 hover:bg-red-500/90' : 'bg-accent-blue hover:bg-accent-blue/90'}`}>
            {isValidating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Validating...</> : <><Shield className="w-4 h-4" />Sign Document</>}
          </button>
        </div>
      </div>
    </div>
  );
}
