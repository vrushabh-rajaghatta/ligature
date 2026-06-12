
import { RefreshCw } from 'lucide-react';
import { useSyncStatus } from '@/components/providers/StoreInitializer';

export function SyncStatusIndicator() {
  const { isLoading } = useSyncStatus();

  // Only show when actively syncing — hide errors and idle state
  if (!isLoading) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border text-accent-blue bg-accent-blue/10 border-accent-blue/30">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      <span className="hidden md:inline">Syncing</span>
    </div>
  );
}

export default SyncStatusIndicator;
