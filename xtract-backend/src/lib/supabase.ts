import { createClient } from '@supabase/supabase-js';

// Supabase configuration (same as your mobile/desktop apps)
const SUPABASE_URL = "https://wgskngtfekehqpnbbanz.supabase.co";
// Using SERVICE ROLE key for backend operations (bypasses RLS)
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYyMjY4MiwiZXhwIjoyMDY2MTk4NjgyfQ.yhrt1Pm_sCwDUcpkTinMZF0_m1s-2zYRzXG2jhmds-k";

// Initialize Supabase client with service role key
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Database types
export interface ProcessingJob {
  id: string;
  user_id: string;
  original_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_audio_file_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AudioFile {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  created_at: string;
  updated_at: string;
} 