import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.location.protocol === 'file:';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isElectron, // Disable for Electron
    flowType: 'pkce',
    // Disable Navigator LockManager for Electron (not fully supported)
    ...(isElectron && {
      lock: (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
        // Simple lock implementation without Navigator LockManager
        return fn();
      }
    })
  }
});

export default supabase;
