import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/environment';
import { SupabaseService } from './supabase';
import { AudioFile, ProcessingJob } from '../types/database';

export interface ExtractionRequest {
  jobId: string;
  userId: string;
  videoStoragePath: string;
  originalFilename?: string;
}

export interface ExtractionResult {
  jobId: string;
  audioFileId: string;
  audioUrl: string;
  storagePath: string;
  filename: string;
  duration: number;
  fileSize: number;
  createdAt: string;
}

// Quality settings for 320kbps high-quality MP3
const QUALITY_SETTINGS = {
  bitrate: '320k',
  sampleRate: 48000,
  channels: 2,
};

export class AudioExtractionService {
  private tempDir: string;
  private supabaseService: SupabaseService;

  constructor() {
    this.tempDir = config.TEMP_DIR;
    this.supabaseService = new SupabaseService();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.ensureTempDirectory();
    this.configureFfmpeg();
  }

  private configureFfmpeg(): void {
    console.log('🔍 Configuring FFmpeg...');
    
    // Try to use environment paths first, then fall back to system
    const ffmpegPath = process.env.FFMPEG_PATH;
    const ffprobePath = process.env.FFPROBE_PATH;

    if (ffmpegPath && ffprobePath) {
      try {
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
        console.log(`✅ FFmpeg configured: ${ffmpegPath}`);
      } catch (error) {
        console.warn('⚠️ Failed to set explicit FFmpeg paths, using system default');
      }
    } else {
      console.log('📡 Using system FFmpeg installation');
    }
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`📁 Created temp directory: ${this.tempDir}`);
    }
  }

  /**
   * Generate a clean filename from original or create one
   */
  private generateFilename(originalFilename?: string): string {
    if (originalFilename) {
      // Remove extension and clean up
      const baseName = path.basename(originalFilename, path.extname(originalFilename));
      // Remove special characters, keep alphanumeric and spaces
      const cleanName = baseName.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
      return cleanName || `audio_${Date.now()}`;
    }
    return `audio_${Date.now()}`;
  }

  /**
   * Main extraction method - processes video from Supabase storage
   */
  async extractAudio(request: ExtractionRequest): Promise<ExtractionResult> {
    const { jobId, userId, videoStoragePath, originalFilename } = request;
    
    let processingJob: ProcessingJob | null = null;
    let localVideoPath: string | null = null;
    let localAudioPath: string | null = null;

    console.log(`🎬 Starting extraction for job: ${jobId}`);
    console.log(`📁 Video path: ${videoStoragePath}`);

    try {
      // Get processing job
      processingJob = await this.supabaseService.getProcessingJob(jobId);
      if (!processingJob) {
        throw new Error(`Processing job ${jobId} not found`);
      }

      // Update status to processing
      await this.supabaseService.updateProcessingJob(jobId, { status: 'processing' });

      // Step 1: Download video from Supabase storage
      console.log('📥 Downloading video from Supabase...');
      const videoBuffer = await this.supabaseService.downloadVideoFile(videoStoragePath);
      console.log(`📊 Video size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Step 2: Write to local temp file
      const videoId = uuidv4();
      localVideoPath = path.join(this.tempDir, `${videoId}.mp4`);
      await fs.writeFile(localVideoPath, videoBuffer);
      console.log(`💾 Saved to temp: ${localVideoPath}`);

      // Step 3: Extract audio with FFmpeg (320kbps MP3)
      const audioFilename = `${this.generateFilename(originalFilename)}.mp3`;
      localAudioPath = path.join(this.tempDir, `${videoId}.mp3`);
      
      await this.runFfmpegExtraction(localVideoPath, localAudioPath);
      console.log('✅ Audio extraction complete');

      // Step 4: Get audio file stats and duration
      const audioStats = await fs.stat(localAudioPath);
      const duration = await this.getAudioDuration(localAudioPath);
      console.log(`📊 Audio: ${(audioStats.size / 1024 / 1024).toFixed(2)} MB, ${Math.round(duration)}s`);

      // Step 5: Upload audio to Supabase storage
      const audioBuffer = await fs.readFile(localAudioPath);
      const audioStoragePath = `${userId}/${videoId}_${Date.now()}.mp3`;
      const audioUrl = await this.supabaseService.uploadAudioFile(
        audioStoragePath,
        audioBuffer,
        'audio/mpeg'
      );
      console.log('☁️ Audio uploaded to Supabase');

      // Step 6: Create audio file record in database
      const audioFile = await this.supabaseService.createAudioFile({
        user_id: userId,
        title: this.generateFilename(originalFilename),
        filename: audioFilename,
        storage_path: audioStoragePath,
        file_url: audioUrl,
        duration: Math.round(duration),
        file_size: audioStats.size,
        synced_to_desktop: false,
      });
      console.log(`📝 Created audio record: ${audioFile.id}`);

      // Step 7: Update processing job as completed
      await this.supabaseService.updateProcessingJob(jobId, {
        status: 'completed',
        audio_file_id: audioFile.id,
      });

      // Step 8: Delete source video from Supabase storage (cleanup)
      console.log('🗑️ Cleaning up source video...');
      await this.supabaseService.deleteVideoFile(videoStoragePath);

      // Step 9: Clean up local temp files
      await this.cleanupTempFiles([localVideoPath, localAudioPath]);
      console.log('🧹 Temp files cleaned');

      const result: ExtractionResult = {
        jobId,
        audioFileId: audioFile.id,
        audioUrl,
        storagePath: audioStoragePath,
        filename: audioFilename,
        duration: Math.round(duration),
        fileSize: audioStats.size,
        createdAt: audioFile.created_at,
      };

      console.log(`✅ Job ${jobId} completed successfully`);
      return result;

    } catch (error: any) {
      console.error(`❌ Extraction failed for job ${jobId}:`, error);

      // Update job as failed
      if (processingJob) {
        try {
          await this.supabaseService.updateProcessingJob(jobId, {
            status: 'failed',
            error_message: error.message,
          });
        } catch (updateError) {
          console.error('Failed to update job status:', updateError);
        }
      }

      // Clean up any temp files
      const filesToClean = [localVideoPath, localAudioPath].filter(Boolean) as string[];
      await this.cleanupTempFiles(filesToClean);

      throw error;
    }
  }

  /**
   * Run FFmpeg to extract audio from video
   */
  private runFfmpegExtraction(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🎵 Running FFmpeg extraction (320kbps MP3)...');
      
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(QUALITY_SETTINGS.bitrate)
        .audioFrequency(QUALITY_SETTINGS.sampleRate)
        .audioChannels(QUALITY_SETTINGS.channels)
        .format('mp3')
        .on('start', (cmd) => {
          console.log(`FFmpeg command: ${cmd}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('error', (err, stdout, stderr) => {
          console.error('FFmpeg error:', err.message);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .on('end', () => {
          console.log('FFmpeg finished');
          resolve();
        })
        .save(outputPath);
    });
  }

  /**
   * Get audio duration using FFprobe
   */
  private getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) {
          console.warn('Failed to get duration, using 0:', err.message);
          resolve(0);
          return;
        }
        resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ProcessingJob | null> {
    return this.supabaseService.getProcessingJob(jobId);
  }

  /**
   * Get audio file download URL
   */
  async getAudioDownloadUrl(audioFileId: string): Promise<string | null> {
    const audioFile = await this.supabaseService.getAudioFile(audioFileId);
    if (!audioFile) return null;

    // Return signed URL for secure download
    return this.supabaseService.createAudioSignedUrl(audioFile.storage_path, 3600);
  }

  /**
   * Cleanup old temp files (called periodically)
   */
  async cleanupOldTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (now - stats.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            console.log(`🧹 Cleaned up old temp file: ${file}`);
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }
    } catch (error) {
      console.error('Temp cleanup error:', error);
    }
  }
}
