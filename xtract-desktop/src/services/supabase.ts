import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Supabase configuration - same project as mobile app
const SUPABASE_URL = 'https://wgskngtfekehqpnbbanz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjI2ODIsImV4cCI6MjA2NjE5ODY4Mn0.iBKnwjDDPaoKI1-kTPdEEKMu3ZPskq95NaxQym4LmRw';

// Storage bucket
const AUDIO_BUCKET = 'audio-files';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types
export interface AudioFile {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  storage_path: string;
  file_url: string;
  file_size: number;
  duration: number;
  created_at: string;
  updated_at: string;
  synced_to_desktop: boolean;
}

// ============================================
// AUTHENTICATION SERVICE
// ============================================
export class AuthService {
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }

  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
}

// ============================================
// AUDIO FILE SERVICE
// ============================================
export class AudioService {
  /**
   * Get all audio files for a user
   */
  static async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get unsynced audio files (new files from mobile)
   */
  static async getUnsyncedFiles(userId: string): Promise<AudioFile[]> {
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .eq('synced_to_desktop', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Mark files as synced to desktop
   */
  static async markAsSynced(audioFileIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('audio_files')
      .update({ 
        synced_to_desktop: true,
        updated_at: new Date().toISOString()
      })
      .in('id', audioFileIds);

    if (error) throw error;
  }

  /**
   * Get signed download URL for an audio file
   */
  static async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error) throw error;
    return data.signedUrl;
  }

  /**
   * Download audio file as blob
   */
  static async downloadAudioFile(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(storagePath);

    if (error) throw error;
    return data;
  }

  /**
   * Delete an audio file (storage + database)
   */
  static async deleteAudioFile(id: string): Promise<void> {
    // Get file info first
    const { data: audioFile, error: fetchError } = await supabase
      .from('audio_files')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (audioFile?.storage_path) {
      await supabase.storage
        .from(AUDIO_BUCKET)
        .remove([audioFile.storage_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Subscribe to new audio files (realtime)
   */
  static subscribeToNewFiles(userId: string, callback: (file: AudioFile) => void) {
    return supabase
      .channel(`audio_files_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audio_files',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        callback(payload.new as AudioFile);
      })
      .subscribe();
  }
}

export default supabase;
