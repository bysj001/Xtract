import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { User, AudioFile, ProcessingJob } from '../types';

// TODO: Replace with your actual Supabase URL and anon key
const SUPABASE_URL = 'https://wgskngtfekehqpnbbanz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjI2ODIsImV4cCI6MjA2NjE5ODY4Mn0.iBKnwjDDPaoKI1-kTPdEEKMu3ZPskq95NaxQym4LmRw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as User | null);
    });
  }
}

export class AudioService {
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
    const { error } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export class ProcessingService {
  static async createProcessingJob(userId: string, originalUrl: string): Promise<ProcessingJob> {
    const { data, error } = await supabase
      .from('processing_jobs')
      .insert({
        user_id: userId,
        original_url: originalUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getProcessingJob(id: string): Promise<ProcessingJob | null> {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  }

  static async getUserProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static subscribeToProcessingJob(jobId: string, callback: (job: ProcessingJob) => void) {
    return supabase
      .channel(`processing_job_${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'processing_jobs',
        filter: `id=eq.${jobId}`,
      }, (payload) => {
        callback(payload.new as ProcessingJob);
      })
      .subscribe();
  }

  static subscribeToProcessingJobs(userId: string, callback: (jobs: ProcessingJob[]) => void) {
    return supabase
      .channel(`processing_jobs_${userId}`)
      .on('postgres_changes', {
        event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'processing_jobs',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        // When any change happens, fetch all jobs for this user
        try {
          const jobs = await this.getUserProcessingJobs(userId);
          callback(jobs);
        } catch (error) {
          // Silently handle error
        }
      })
      .subscribe();
  }
}

export class BackendService {
  // Vercel deployment URL - xtract-backend coordinates with Railway audio-extraction
  // Project: https://vercel.com
  private static BACKEND_URL = 'https://xtract-2ucjql3jc-brians-projects-998b86c6.vercel.app';

  static async processVideoUrl(url: string, userId: string): Promise<{ jobId: string; audioFileId?: string }> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/api/extract-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagramUrl: url,
          userId: userId,
          format: 'mp3',
          quality: 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || data.error || 'Processing failed');
      }
      
      return {
        jobId: data.data.jobId,
        audioFileId: data.data.audioFileId
      };
    } catch (error) {
      throw error;
    }
  }
} 