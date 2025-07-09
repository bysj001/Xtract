import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, AudioFile, ProcessingJob } from '../types/database';
import { config } from '../config/environment';

export class SupabaseService {
  private client: SupabaseClient<Database>;

  constructor() {
    this.client = createClient<Database>(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY
    );
  }

  // Audio File operations
  async createAudioFile(audioFile: Database['public']['Tables']['audio_files']['Insert']): Promise<AudioFile> {
    const { data, error } = await this.client
      .from('audio_files')
      .insert(audioFile)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating audio file:', error);
      throw new Error(`Failed to create audio file: ${error.message}`);
    }

    return data;
  }

  async updateAudioFile(id: string, updates: Database['public']['Tables']['audio_files']['Update']): Promise<AudioFile> {
    const { data, error } = await this.client
      .from('audio_files')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating audio file:', error);
      throw new Error(`Failed to update audio file: ${error.message}`);
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
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Supabase error getting audio file:', error);
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
      console.error('Supabase error getting user audio files:', error);
      throw new Error(`Failed to get user audio files: ${error.message}`);
    }

    return data || [];
  }

  async deleteAudioFile(id: string): Promise<void> {
    const { error } = await this.client
      .from('audio_files')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error deleting audio file:', error);
      throw new Error(`Failed to delete audio file: ${error.message}`);
    }
  }

  // Processing Job operations
  async createProcessingJob(job: Database['public']['Tables']['processing_jobs']['Insert']): Promise<ProcessingJob> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating processing job:', error);
      throw new Error(`Failed to create processing job: ${error.message}`);
    }

    return data;
  }

  async updateProcessingJob(id: string, updates: Database['public']['Tables']['processing_jobs']['Update']): Promise<ProcessingJob> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating processing job:', error);
      throw new Error(`Failed to update processing job: ${error.message}`);
    }

    return data;
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Supabase error getting processing job:', error);
      throw new Error(`Failed to get processing job: ${error.message}`);
    }

    return data;
  }

  async getUserProcessingJobs(userId: string): Promise<ProcessingJob[]> {
    const { data, error } = await this.client
      .from('processing_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error getting user processing jobs:', error);
      throw new Error(`Failed to get user processing jobs: ${error.message}`);
    }

    return data || [];
  }

  // Storage operations for audio files
  async uploadAudioFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from('audio-files')
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error uploading file:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = this.client.storage
      .from('audio-files')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  }

  async deleteStorageFile(filePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from('audio-files')
      .remove([filePath]);

    if (error) {
      console.error('Supabase storage error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  // Get the Supabase client for direct operations if needed
  getClient(): SupabaseClient<Database> {
    return this.client;
  }
} 