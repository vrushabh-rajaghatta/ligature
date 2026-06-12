
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2, Shield, Eye, EyeOff } from 'lucide-react';

type Stage = 'validating' | 'setup' | 'creating' | 'done' | 'error';

export default function InviteAcceptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params?.token as string;
  const emailFromLink = searchParams?.get('email') || '';
  const roleFromLink = searchParams?.get('role') || 'reviewer';

  const [stage, setStage] = useState<Stage>('validating');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(3);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) { setErrorMsg('Missing invitation token.'); setStage('error'); return; }
    if (!/^[a-f0-9]{48}$/.test(token)) { setErrorMsg('This invitation link is invalid or has expired.'); setStage('error'); return; }
    const t = setTimeout(() => setStage('setup'), 600);
    return () => clearTimeout(t);
  }, [token]);

  useEffect(() => {
    if (stage !== 'done') return;
    if (countdown <= 0) { router.push('/'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, countdown, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) { setFormError('Please enter your full name.'); return; }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setFormError('Passwords do not match.'); return; }
    setStage('creating');
    try {
      const res = await fetch('/api/users/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: emailFromLink, name: name.trim(), password, role: roleFromLink }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setFormError(data.error || 'Something went wrong.'); setStage('setup'); return; }
      setStage('done');
    } catch {
      setFormError('Network error. Please try again.');
      setStage('setup');
    }
  }

  const roleLabel = roleFromLink.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">LIGATURE</span>
          </div>
          <p className="text-sm text-slate-400">Intelligent R&D Operations Platform</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

          {stage === 'validating' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Validating your invitation…</h1>
            </div>
          )}

          {(stage === 'setup' || stage === 'creating') && (
            <div>
              <h1 className="text-xl font-semibold text-white mb-1">Set up your account</h1>
              <p className="text-sm text-slate-400 mb-6">
                Invited as <span className="text-blue-400 font-medium">{roleLabel}</span>
                {emailFromLink && <> · <span className="text-slate-300">{emailFromLink}</span></>}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Jane Smith" disabled={stage === 'creating'}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                  <input type="email" value={emailFromLink} readOnly
                    className="w-full px-4 py-2.5 bg-slate-700/30 border border-slate-700 rounded-lg text-slate-400 text-sm cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Create password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
                      disabled={stage === 'creating'}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm password</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password"
                    disabled={stage === 'creating'}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50" />
                </div>
                {password.length > 0 && (
                  <div className="flex gap-1">
                    {[8, 12, 16, 20].map((threshold, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= threshold
                          ? ['bg-red-500','bg-yellow-500','bg-blue-500','bg-emerald-500'][i]
                          : 'bg-slate-700'}`} />
                    ))}
                  </div>
                )}
                {formError && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300">{formError}</p>
                  </div>
                )}
                <button type="submit" disabled={stage === 'creating'}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-2">
                  {stage === 'creating' ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating your account…</>) : 'Create account & sign in'}
                </button>
              </form>
            </div>
          )}

          {stage === 'done' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Welcome to Ligature!</h1>
              <p className="text-sm text-slate-400 mb-6">
                Your account is ready. Taking you to the platform in <span className="text-white font-semibold">{countdown}</span>…
              </p>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden mb-6">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }} />
              </div>
              <button onClick={() => router.push('/')}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm">
                Enter Ligature now →
              </button>
            </div>
          )}

          {stage === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-white mb-2">Invalid invitation</h1>
              <p className="text-sm text-slate-400 mb-6">{errorMsg || 'This link is invalid or has expired.'}</p>
              <button onClick={() => router.push('/')}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors text-sm">
                Return to Ligature
              </button>
            </div>
          )}

        </div>
        <p className="text-center text-xs text-slate-600 mt-6">© Ligature · Intelligent R&D Operations · ligaturerd.io</p>
      </div>
    </div>
  );
}
