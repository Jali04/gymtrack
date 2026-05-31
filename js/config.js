/* =============================================
   GYMTRACK / DSCPLN — Configuration
   ============================================= */

const SUPABASE_CONFIG = {
  // Replace these with your actual Supabase credentials:
  url: 'https://delftllxvzpkbdarqdpd.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGZ0bGx4dnpwa2JkYXJxZHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTQ4MDcsImV4cCI6MjA5NTgzMDgwN30.oxVl_W9AMn5Iu21tqUHpyNZMxFsKczSpDplHXXa2SAM',

  // Computed URL for the AI Proxy Edge Function
  get aiProxyUrl() {
    if (this.url === 'YOUR_SUPABASE_URL' || this.url === 'SUPABASE_URL') return '';
    const cleanUrl = this.url.endsWith('/') ? this.url.slice(0, -1) : this.url;
    return `${cleanUrl}/functions/v1/ai-proxy`;
  }
};
