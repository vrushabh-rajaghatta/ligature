
/**
 * Supabase Browser Client
 * For use in client components
 * 
 * @version 0.27.58
 */


import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig, isSupabaseConfigured } from './config';

// =============================================================================
// BROWSER CLIENT
// =============================================================================

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create the Supabase browser client
 * Uses singleton pattern for efficiency
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    console.warn('[Supabase] Not configured - using fallback auth');
    return null;
  }
  
  if (!browserClient) {
    browserClient = createBrowserClient(
      supabaseConfig.url,
      supabaseConfig.anonKey
    );
  }
  
  return browserClient;
}

/**
 * Create a new browser client instance
 * Use when you need a fresh client (e.g., after logout)
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  return createBrowserClient(
    supabaseConfig.url,
    supabaseConfig.anonKey
  );
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const supabase = getSupabaseBrowserClient();
