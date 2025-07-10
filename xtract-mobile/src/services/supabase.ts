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
  // Railway direct URL for video processing from Supabase
  private static RAILWAY_URL = 'https://audio-extraction-production-8a74.up.railway.app';

  // NEW: Process video file directly via Supabase (NO VERCEL BACKEND!)
  static async processVideoFile(videoFileUri: string, userId: string, fileName?: string): Promise<{ jobId: string; audioFileId?: string }> {
    try {
      console.log('🎬 Processing video file directly via Supabase - no API calls needed!');
      console.log(`📁 Video URI: ${videoFileUri.substring(0, 50)}...`);
      
      // Step 1: Read the video file from the local URI
      const videoResponse = await fetch(videoFileUri);
      if (!videoResponse.ok) {
        throw new Error(`Failed to read video file: ${videoResponse.statusText}`);
      }
      
      const videoBlob = await videoResponse.blob();
      console.log(`📊 Video file size: ${videoBlob.size} bytes, type: ${videoBlob.type}`);
      
      // Step 2: Upload video to Supabase Storage
      const timestamp = Date.now();
      const videoFileName = fileName || `video_${timestamp}.mp4`;
      const storagePath = `videos/${userId}/${timestamp}_${videoFileName}`;
      
      console.log(`☁️ Uploading video to Supabase Storage: ${storagePath}`);
      
      // Convert blob to ArrayBuffer for Supabase upload
      const arrayBuffer = await videoBlob.arrayBuffer();
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(storagePath, arrayBuffer, {
          contentType: videoBlob.type || 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload video to Supabase: ${uploadError.message}`);
      }

      console.log('✅ Video uploaded to Supabase Storage');
      
      // Step 3: Create processing job in Supabase database
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: userId,
          video_url: storagePath, // Store Supabase path instead of external URL
          status: 'pending',
          source_type: 'native_share' // Mark as native sharing
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create processing job: ${jobError.message}`);
      }

      console.log(`📋 Created processing job: ${jobData.id}`);
      
      // Step 4: Trigger Railway processing
      console.log('🚂 Triggering Railway audio extraction...');
      
      const railwayResponse = await fetch(`${this.RAILWAY_URL}/api/extract/from-supabase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobData.id,
          userId: userId,
          videoPath: storagePath,
          format: 'mp3',
          quality: 'medium'
        }),
      });

      if (!railwayResponse.ok) {
        const errorData = await railwayResponse.json();
        throw new Error(errorData.message || errorData.error || `Railway processing error: ${railwayResponse.status}`);
      }

      const railwayData = await railwayResponse.json();
      
      if (!railwayData.success) {
        throw new Error(railwayData.message || railwayData.error || 'Railway processing failed');
      }

      console.log('✅ Railway processing started successfully!');
      
      return {
        jobId: jobData.id,
        audioFileId: railwayData.audioFileId
      };
    } catch (error) {
      console.error('❌ Direct video processing error:', error);
      throw error;
    }
  }

  // LEGACY: Process video URL (still needed for manual URL input - but no longer primary method)
  static async processVideoUrl(url: string, userId: string): Promise<{ jobId: string; audioFileId?: string }> {
    try {
      console.log('🔗 Processing video URL via legacy method (may hit Instagram rate limits)');
      
      // For URLs, we still need to create a job and let Railway handle the download
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: userId,
          video_url: url, // External URL
          status: 'pending',
          source_type: 'url_input' // Mark as URL input
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create processing job: ${jobError.message}`);
      }

      console.log(`📋 Created URL processing job: ${jobData.id}`);
      
      // Trigger Railway with URL processing (existing endpoint)
      const railwayResponse = await fetch(`${this.RAILWAY_URL}/api/extract/from-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobData.id,
          videoUrl: url,
          userId: userId,
          format: 'mp3',
          quality: 'medium'
        }),
      });

      if (!railwayResponse.ok) {
        const errorData = await railwayResponse.json();
        throw new Error(errorData.message || errorData.error || `Railway processing error: ${railwayResponse.status}`);
      }

      const railwayData = await railwayResponse.json();
      
      if (!railwayData.success) {
        throw new Error(railwayData.message || railwayData.error || 'Railway processing failed');
      }

      console.log('✅ URL processing started via Railway');
      
      return {
        jobId: jobData.id,
        audioFileId: railwayData.audioFileId
      };
    } catch (error) {
      console.error('❌ URL processing error:', error);
      throw error;
    }
  }
} 