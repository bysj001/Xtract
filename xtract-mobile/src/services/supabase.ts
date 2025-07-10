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
  private static BACKEND_URL = 'https://xtract-azh16the6-brians-projects-998b86c6.vercel.app';

  static async processVideoUrl(url: string, userId: string): Promise<{ jobId: string; audioFileId?: string }> {
    try {
      console.log('🔄 Step 1: Getting Instagram data (no video download)...');
      
      // Step 1: Get Instagram data only (no video downloading on backend)
      const instagramResponse = await fetch(`${this.BACKEND_URL}/api/extract-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagramUrl: url
        }),
      });

      if (!instagramResponse.ok) {
        const errorData = await instagramResponse.json();
        throw new Error(errorData.message || errorData.error || `Instagram API error: ${instagramResponse.status}`);
      }

      const instagramData = await instagramResponse.json();
      
      if (!instagramData.success) {
        throw new Error(instagramData.message || instagramData.error || 'Failed to get Instagram data');
      }

      const { shortcode, videoUrl, metadata } = instagramData.data;
      
      console.log('✅ Step 1 complete: Got Instagram data');
      console.log('🔄 Step 2: Downloading video via browser proxy...');

      // Step 2: Download video via frontend (browser-like behavior)
      const proxyUrl = new URL("/api/download-proxy", this.BACKEND_URL);
      proxyUrl.searchParams.set("url", videoUrl);
      proxyUrl.searchParams.set("filename", `${shortcode}.mp4`);
      
      const videoResponse = await fetch(proxyUrl.toString());
      
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const videoBlob = await videoResponse.blob();
      
      console.log('✅ Step 2 complete: Downloaded video via proxy');
      console.log(`📁 Video blob size: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
      console.log('🔄 Step 3: Uploading video for processing...');

      // Step 3: Upload video + metadata for processing
      const formData = new FormData();
      
      // React Native FormData - append blob with explicit filename  
      formData.append('videoFile', videoBlob, `${shortcode}.mp4`);
      
      console.log(`📄 Appending video to FormData: ${shortcode}.mp4, size: ${videoBlob.size}, type: ${videoBlob.type}`);
      formData.append('userId', userId);
      formData.append('shortcode', shortcode);
      formData.append('instagramUrl', url);
      formData.append('metadata', JSON.stringify(metadata));
      formData.append('format', 'mp3');
      formData.append('quality', 'medium');
      
            console.log('📋 FormData prepared with:', {
        videoFile: `${shortcode}.mp4 (${videoBlob.size} bytes)`,
        userId,
        shortcode,
        instagramUrl: url,
        hasMetadata: !!metadata
      });

      console.log('🌐 Making request to process-video...');
      
      const processResponse = await fetch(`${this.BACKEND_URL}/api/process-video`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser/React Native set it automatically for FormData
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.message || errorData.error || `Processing error: ${processResponse.status}`);
      }

      const processData = await processResponse.json();
      
      if (!processData.success) {
        throw new Error(processData.message || processData.error || 'Processing failed');
      }

      console.log('✅ Step 3 complete: Video uploaded and processing started');
      
      return {
        jobId: processData.data.jobId,
        audioFileId: processData.data.audioFileId
      };
    } catch (error) {
      console.error('❌ BackendService error:', error);
      throw error;
    }
  }
} 