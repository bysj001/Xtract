import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, AudioFile, ProcessingJob } from '../types/database';
import { config } from '../config/environment';

// Storage bucket names
export const STORAGE_BUCKETS = {
  VIDEOS: 'videos',
  AUDIO: 'audio-files',
} as const;

export class SupabaseService {
  private client: SupabaseClient<Database>;

  constructor() {
    // Use service role key for backend operations (bypasses RLS)
    this.client = createClient<Database>(
      config.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  get supabaseClient(): SupabaseClient<Database> {
    return this.client;
  }

  // ============================================
  // VIDEO STORAGE OPERATIONS
  // ============================================

  /**
   * Download video file from Supabase storage
   */
  async downloadVideoFile(storagePath: string): Promise<Buffer> {
    console.log(`📥 Downloading video from storage: ${storagePath}`);
    
    const { data, error } = await this.client.storage
      .from(STORAGE_BUCKETS.VIDEOS)
      .download(storagePath);

    if (error || !data) {
      throw new Error(`Failed to download video: ${error?.message || 'No data returned'}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete video file from storage after processing
   */
  async deleteVideoFile(storagePath: string): Promise<void> {
    console.log(`🗑️ Deleting processed video: ${storagePath}`);
    
    const { error } = await this.client.storage
      .from(STORAGE_BUCKETS.VIDEOS)
      .remove([storagePath]);

    if (error) {
      console.error(`Warning: Failed to delete video file: ${error.message}`);
      // Don't throw - cleanup failures shouldn't break the flow
    }
  }

  /**
   * Create signed URL for video download (used by mobile app)
   */
  async createVideoSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(STORAGE_BUCKETS.VIDEOS)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  // ============================================
  // AUDIO STORAGE OPERATIONS
  // ============================================

  /**
   * Upload extracted audio file to storage
   */
  async uploadAudioFile(
    storagePath: string,
    buffer: Buffer,
    contentType: string = 'audio/mpeg'
  ): Promise<string> {
    console.log(`📤 Uploading audio to storage: ${storagePath}`);
    
    const { data, error } = await this.client.storage
      .from(STORAGE_BUCKETS.AUDIO)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
        cacheControl: '31536000', // 1 year cache
      });

    if (error) {
      throw new Error(`Failed to upload audio: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = this.client.storage
      .from(STORAGE_BUCKETS.AUDIO)
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  /**
   * Create signed URL for audio download
   */
  async createAudioSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(STORAGE_BUCKETS.AUDIO)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create audio signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Delete audio file from storage
   */
  async deleteAudioFile(storagePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(STORAGE_BUCKETS.AUDIO)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete audio file: ${error.message}`);
    }
  }

  // ============================================
  // AUDIO FILE DATABASE OPERATIONS
  // ============================================

  async createAudioFile(
    audioFile: Database['public']['Tables']['audio_files']['Insert']
  ): Promise<AudioFile> {
    const { data, error } = await this.client
      .from('audio_files')
      .insert(audioFile)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audio file record: ${error.message}`);
    }

    return data;
  }

  async getAudioFile(id: string): Promise<AudioFile | null> {
    const { data, error } = await this.client
      .from('audio_files')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get audio file: ${error.message}`);
    }

    return data;
  }

  async getUserAudioFiles(userId: string): Promise<AudioFile[]> {
    const { data, error } = await this.client
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user audio files: ${error.message}`);
    }

    return data || [];
  }

  async updateAudioFile(
    id: string,
    updates: Database['public']['Tables']['audio_files']['Update']
  ): Promise<AudioFile> {
    const { data, error } = await this.client
      .from('audio_files')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update audio file: ${error.message}`);
    }

    return data;
  }

  async deleteAudioFileRecord(id: string): Promise<void> {
    const { error } = await this.client
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete audio file record: ${error.message}`);
    }
  }

  // ============================================
  // PROCESSING JOB OPERATIONS
  // ============================================

  async createProcessingJob(
    job: Database['public']['Tables']['processing_jobs']['Insert']
  ): Promise<ProcessingJob> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create processing job: ${error.message}`);
    }

    return data;
  }

  async getProcessingJob(jobId: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get processing job: ${error.message}`);
    }

    return data;
  }

  async updateProcessingJob(
    id: string,
    updates: Database['public']['Tables']['processing_jobs']['Update']
  ): Promise<ProcessingJob> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update processing job: ${error.message}`);
    }

    return data;
  }

  async getPendingJobs(limit: number = 10): Promise<ProcessingJob[]> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`);
    }

    return data || [];
  }

  async getUserProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user processing jobs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get unsynced audio files for desktop sync
   */
  async getUnsyncedAudioFiles(userId: string): Promise<AudioFile[]> {
    const { data, error } = await this.client
      .from('audio_files')
      .select('*')
      .eq('user_id', userId)
      .eq('synced_to_desktop', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get unsynced audio files: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark audio files as synced to desktop
   */
  async markAsSynced(audioFileIds: string[]): Promise<void> {
    const { error } = await this.client
      .from('audio_files')
      .update({ synced_to_desktop: true, updated_at: new Date().toISOString() })
      .in('id', audioFileIds);

    if (error) {
      throw new Error(`Failed to mark files as synced: ${error.message}`);
    }
  }
}
