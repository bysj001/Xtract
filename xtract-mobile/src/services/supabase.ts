import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';
import { User, AudioFile, ProcessingJob, VideoFileData } from '../types';

// Supabase configuration
const SUPABASE_URL = 'https://wgskngtfekehqpnbbanz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjI2ODIsImV4cCI6MjA2NjE5ODY4Mn0.iBKnwjDDPaoKI1-kTPdEEKMu3ZPskq95NaxQym4LmRw';

// Railway backend URL for audio extraction
const RAILWAY_BACKEND_URL = 'https://audio-extraction-production-8a74.up.railway.app';

// Storage bucket names
const STORAGE_BUCKETS = {
  VIDEOS: 'videos',
  AUDIO: 'audio-files',
} as const;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

// ============================================
// AUDIO SERVICE
// ============================================
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
    // Get the file first to get storage path
    const { data: file, error: fetchError } = await supabase
      .from('audio_files')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (file?.storage_path) {
      await supabase.storage
        .from(STORAGE_BUCKETS.AUDIO)
        .remove([file.storage_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.AUDIO)
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }
}

// ============================================
// PROCESSING SERVICE
// ============================================
export class ProcessingService {
  static async getUserProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getProcessingJob(id: string): Promise<ProcessingJob | null> {
    const { data, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
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
}

// ============================================
// VIDEO UPLOAD & PROCESSING SERVICE
// ============================================
export class VideoProcessingService {
  /**
   * Main method to process a shared video file
   * 1. Upload video to Supabase storage
   * 2. Create processing job record
   * 3. Trigger Railway backend for extraction
   */
  static async processVideoFile(
    videoFile: VideoFileData,
    userId: string
  ): Promise<{ jobId: string; status: string }> {
    console.log('🎬 Starting video processing workflow...');
    console.log(`📁 File: ${videoFile.name}`);
    console.log(`📊 Type: ${videoFile.type}`);

    try {
      // Step 1: Read video file from local URI
      console.log('📖 Reading video file...');
      const response = await fetch(videoFile.uri);
      if (!response.ok) {
        throw new Error(`Failed to read video file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      console.log(`📊 Video size: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

      // Validate file size (max 300MB)
      const maxSize = 300 * 1024 * 1024;
      if (arrayBuffer.byteLength > maxSize) {
        throw new Error('Video file is too large. Maximum size is 300MB.');
      }

      // Step 2: Generate storage path and upload to Supabase
      const timestamp = Date.now();
      const sanitizedName = videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${timestamp}_${sanitizedName}`;
      
      console.log(`☁️ Uploading to Supabase: ${storagePath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.VIDEOS)
        .upload(storagePath, arrayBuffer, {
          contentType: videoFile.type || 'video/mp4',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Video uploaded successfully');

      // Step 3: Create processing job in database
      console.log('📋 Creating processing job...');
      
      const { data: jobData, error: jobError } = await supabase
        .from('processing_jobs')
        .insert({
          user_id: userId,
          video_storage_path: storagePath,
          status: 'pending',
          original_filename: videoFile.name,
        })
        .select()
        .single();

      if (jobError) {
        // Clean up uploaded video on failure
        await supabase.storage.from(STORAGE_BUCKETS.VIDEOS).remove([storagePath]);
        throw new Error(`Failed to create job: ${jobError.message}`);
      }

      console.log(`✅ Processing job created: ${jobData.id}`);

      // Step 4: Trigger Railway backend for audio extraction
      console.log('🚂 Triggering audio extraction...');
      
      const extractResponse = await fetch(`${RAILWAY_BACKEND_URL}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobData.id,
          userId: userId,
          videoStoragePath: storagePath,
          originalFilename: videoFile.name,
        }),
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json().catch(() => ({}));
        console.warn('Railway extraction failed:', errorData);
        // Don't throw - the job was created, backend might retry
      } else {
        const extractData = await extractResponse.json();
        console.log('✅ Audio extraction completed:', extractData);
      }

      return {
        jobId: jobData.id,
        status: 'processing',
      };

    } catch (error: any) {
      console.error('❌ Video processing failed:', error);
      throw error;
    }
  }

  /**
   * Get the current status of a processing job
   */
  static async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    return ProcessingService.getProcessingJob(jobId);
  }

  /**
   * Subscribe to job status updates
   */
  static subscribeToJob(jobId: string, callback: (job: ProcessingJob) => void) {
    return ProcessingService.subscribeToProcessingJob(jobId, callback);
  }
}
