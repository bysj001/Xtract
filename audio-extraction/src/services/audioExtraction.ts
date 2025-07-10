import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import { config } from '../config/environment';
import { SupabaseService } from './supabase';
import { AudioFile, ProcessingJob } from '../types/database';

export interface ExtractionRequest {
  videoUrl: string;
  shortcode: string;
  userId: string;
  format: 'mp3' | 'wav' | 'aac' | 'ogg';
  quality: 'low' | 'medium' | 'high';
  videoTitle?: string;
}

export interface ExtractionResult {
  jobId: string;
  audioFileId: string;
  audioUrl: string;
  format: string;
  size: number;
  duration: number;
  createdAt: string;
  supabaseUrl: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  result?: ExtractionResult;
  audioFileId?: string;
}

export interface DownloadInfo {
  filename: string;
  mimeType: string;
  size: number;
  stream: NodeJS.ReadableStream;
}

export class AudioExtractionService {
  private jobs: Map<string, JobStatus> = new Map();
  private tempDir: string;
  private supabaseService: SupabaseService;

  constructor() {
    this.tempDir = config.TEMP_DIR;
    this.supabaseService = new SupabaseService();
    this.ensureTempDirectory();
    this.configureFfmpeg();
  }

  private configureFfmpeg(): void {
    // Try multiple common FFmpeg paths and let fluent-ffmpeg auto-detect
    const possiblePaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg', 
      'ffmpeg'  // Let system PATH handle it
    ];
    
    console.log('🔍 Configuring FFmpeg...');
    
    // If environment variables are empty, let fluent-ffmpeg auto-detect
    if (!process.env.FFMPEG_PATH || process.env.FFMPEG_PATH === '') {
      console.log('📡 Attempting FFmpeg auto-detection...');
      
      // Test if FFmpeg is available without setting explicit paths
      ffmpeg().getAvailableFormats((err, formats) => {
        if (err) {
          console.error('❌ FFmpeg auto-detection failed:', err.message);
          console.log('🔧 Trying manual path detection...');
        } else {
          console.log('✅ FFmpeg auto-detection successful!');
        }
      });
      
    } else {
      // Use explicit paths from environment
      const ffmpegPath = process.env.FFMPEG_PATH;
      const ffprobePath = process.env.FFPROBE_PATH;
      
      if (ffmpegPath && ffprobePath) {
        try {
          ffmpeg.setFfmpegPath(ffmpegPath);
          ffmpeg.setFfprobePath(ffprobePath);
          
          console.log(`✅ FFmpeg configured with explicit paths:`);
          console.log(`   FFmpeg: ${ffmpegPath}`);
          console.log(`   FFprobe: ${ffprobePath}`);
        } catch (error) {
          console.warn('⚠️ Failed to set explicit FFmpeg paths:', error);
        }
      } else {
        console.log('⚠️ FFMPEG_PATH or FFPROBE_PATH not set, falling back to auto-detection');
      }
    }
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  private getQualitySettings(quality: string): { bitrate: string; sampleRate: number } {
    switch (quality) {
      case 'low':
        return { bitrate: '64k', sampleRate: 22050 };
      case 'high':
        return { bitrate: '320k', sampleRate: 48000 };
      default: // medium
        return { bitrate: '128k', sampleRate: 44100 };
    }
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
    };
    return mimeTypes[format] || 'audio/mpeg';
  }

  private generateTitle(shortcode: string, videoTitle?: string): string {
    if (videoTitle) {
      return videoTitle;
    }
    return `Audio from ${shortcode}`;
  }

  async extractAudioFromUrl(request: ExtractionRequest): Promise<ExtractionResult> {
    const jobId = uuidv4();
    const { videoUrl, shortcode, userId, format, quality, videoTitle } = request;

    let processingJob: ProcessingJob | null = null;
    let audioFileRecord: AudioFile | null = null;

    // Initialize job status
    this.jobs.set(jobId, {
      jobId,
      status: 'pending',
      progress: 0,
    });

    try {
      // Create processing job in Supabase
      processingJob = await this.supabaseService.createProcessingJob({
        user_id: userId,
        video_url: videoUrl,
        status: 'pending',
      });

      // Update local job with processing job ID
      this.jobs.set(jobId, {
        jobId,
        status: 'processing',
        progress: 10,
      });

      // Update processing job status
      await this.supabaseService.updateProcessingJob(processingJob.id, {
        status: 'processing',
      });

      // Download video from URL
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }

      // Create temporary video file
      const videoFileName = `${shortcode}_${Date.now()}.mp4`;
      const videoPath = path.join(this.tempDir, videoFileName);
      
      const videoBuffer = await videoResponse.arrayBuffer();
      await fs.writeFile(videoPath, Buffer.from(videoBuffer));

      // Update progress
      this.jobs.set(jobId, {
        jobId,
        status: 'processing',
        progress: 30,
      });

      // Extract audio using ffmpeg
      const audioFileName = `${shortcode}_${Date.now()}.${format}`;
      const audioPath = path.join(this.tempDir, audioFileName);
      
      const qualitySettings = this.getQualitySettings(quality);

      await this.extractAudio(videoPath, audioPath, format, qualitySettings);

      // Update progress
      this.jobs.set(jobId, {
        jobId,
        status: 'processing',
        progress: 60,
      });

      // Get audio file stats and duration
      const audioStats = await fs.stat(audioPath);
      const duration = await this.getAudioDuration(audioPath);

      // Upload audio file to Supabase Storage
      const audioBuffer = await fs.readFile(audioPath);
      const storageFilePath = `${userId}/${shortcode}_${Date.now()}.${format}`;
      const supabaseUrl = await this.supabaseService.uploadAudioFile(
        storageFilePath,
        audioBuffer,
        this.getMimeType(format)
      );

      // Update progress
      this.jobs.set(jobId, {
        jobId,
        status: 'processing',
        progress: 80,
      });

      // Create audio file record in Supabase
      const title = this.generateTitle(shortcode, videoTitle);
      audioFileRecord = await this.supabaseService.createAudioFile({
        user_id: userId,
        title,
        filename: audioFileName,
        source_url: videoUrl,
        file_url: supabaseUrl,
        duration,
        file_size: audioStats.size,
      });

      // Update processing job with completion
      await this.supabaseService.updateProcessingJob(processingJob.id, {
        status: 'completed',
        audio_file_id: audioFileRecord.id,
      });

      // Clean up temporary files
      await fs.unlink(videoPath);
      await fs.unlink(audioPath);

      // Create result
      const result: ExtractionResult = {
        jobId,
        audioFileId: audioFileRecord.id,
        audioUrl: `/api/extract/download/${jobId}`,
        format,
        size: audioStats.size,
        duration,
        createdAt: audioFileRecord.created_at,
        supabaseUrl,
      };

      // Update job status to completed
      this.jobs.set(jobId, {
        jobId,
        status: 'completed',
        progress: 100,
        result,
        audioFileId: audioFileRecord.id,
      });

      return result;
    } catch (error: any) {
      console.error(`Audio extraction failed for job ${jobId}:`, error);
      
      // Update processing job status to failed
      if (processingJob) {
        try {
          await this.supabaseService.updateProcessingJob(processingJob.id, {
            status: 'failed',
            error_message: error.message,
          });
        } catch (updateError) {
          console.error('Failed to update processing job status:', updateError);
        }
      }

      // Update local job status to failed
      this.jobs.set(jobId, {
        jobId,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  private extractAudio(
    inputPath: string,
    outputPath: string,
    format: string,
    qualitySettings: { bitrate: string; sampleRate: number }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec(format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le')
        .audioBitrate(qualitySettings.bitrate)
        .audioFrequency(qualitySettings.sampleRate)
        .format(format)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .on('end', () => {
          console.log('Audio extraction completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  private getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    return this.jobs.get(jobId) || null;
  }

  async getDownloadInfo(jobId: string): Promise<DownloadInfo | null> {
    const job = this.jobs.get(jobId);
    
    if (!job || job.status !== 'completed' || !job.audioFileId) {
      return null;
    }

    try {
      // Get audio file record from Supabase
      const audioFile = await this.supabaseService.getAudioFile(job.audioFileId);
      
      if (!audioFile) {
        return null;
      }

      // For now, we'll return a redirect to the Supabase URL
      // In a production setup, you might want to proxy the download
      return {
        filename: audioFile.filename,
        mimeType: this.getMimeType(audioFile.filename.split('.').pop() || 'mp3'),
        size: audioFile.file_size || 0,
        stream: createReadStream(''), // This will be handled differently - redirect to Supabase URL
      };
    } catch (error) {
      console.error('Error getting download info:', error);
      return null;
    }
  }

  // Get Supabase URL for direct download
  async getSupabaseDownloadUrl(jobId: string): Promise<string | null> {
    const job = this.jobs.get(jobId);
    
    if (!job || job.status !== 'completed' || !job.audioFileId) {
      return null;
    }

    try {
      const audioFile = await this.supabaseService.getAudioFile(job.audioFileId);
      return audioFile?.file_url || null;
    } catch (error) {
      console.error('Error getting Supabase download URL:', error);
      return null;
    }
  }

  // Cleanup old jobs and files
  async cleanup(): Promise<void> {
    const now = Date.now();
    const retentionMs = config.FILE_RETENTION_HOURS * 60 * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - new Date(job.result?.createdAt || 0).getTime();
      
      if (jobAge > retentionMs) {
        // Remove job from memory (Supabase records are kept for user's library)
        this.jobs.delete(jobId);
      }
    }
  }
} 