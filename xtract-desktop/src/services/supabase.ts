import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Using the same Supabase project as your mobile app
const SUPABASE_URL = 'https://wgskngtfekehqpnbbanz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjI2ODIsImV4cCI6MjA2NjE5ODY4Mn0.iBKnwjDDPaoKI1-kTPdEEKMu3ZPskq95NaxQym4LmRw';

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
  filename: string;
  file_url: string;
  file_size: number;
  duration?: number;
  created_at: string;
  updated_at: string;
}

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

// Authentication Service
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

// Audio File Service
export class AudioService {
  static async uploadAudioFile(file: File, userId: string): Promise<AudioFile> {
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      // Save file metadata to database
      const { data, error } = await supabase
        .from('audio_files')
        .insert({
          user_id: userId,
          filename: file.name,
          file_url: publicUrl,
          file_size: file.size,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  static async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async deleteAudioFile(id: string): Promise<void> {
    try {
      // Get file info first
      const { data: audioFile, error: fetchError } = await supabase
        .from('audio_files')
        .select('file_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (audioFile.file_url) {
        const fileName = audioFile.file_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('audio-files')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('audio_files')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  static async downloadAudioFile(fileUrl: string): Promise<Blob> {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }
}

// Export the supabase client for direct use if needed
export default supabase; 