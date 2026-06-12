
/**
 * App Providers
 * Wraps the app with all necessary providers
 * 
 * @version 0.33.16
 */

import { StoreInitializer } from './StoreInitializer';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Check if we're in demo mode (no Supabase configured)
  const demoMode = typeof window !== 'undefined' && 
    !import.meta.env.VITE_SUPABASE_URL;
  
  return (
    <StoreInitializer demoMode={demoMode}>
      {children}
    </StoreInitializer>
  );
}

export default Providers;
