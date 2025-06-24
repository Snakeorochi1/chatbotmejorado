
// global.d.ts
export {}; // Ensure this file is treated as a module.

declare global {
  interface Window {
    process?: {
      env?: {
        API_KEY?: string;
        SUPABASE_URL?: string;
        SUPABASE_ANON_KEY?: string;
        // Add other environment variables here if needed
      };
    };
  }
}
