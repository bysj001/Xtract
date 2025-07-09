import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

export class AudioProcessor {
  private tempDir: string;

  constructor() {
    this.tempDir = '/tmp';
  }

  async downloadVideo(videoUrl: string): Promise<string> {
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.5',
        'Range': 'bytes=0-',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    const videoPath = path.join(this.tempDir, `video_${uuidv4()}.mp4`);
    
    await fs.writeFile(videoPath, Buffer.from(videoBuffer));
    
    console.log(`[INFO] Video downloaded: ${videoPath} (${videoBuffer.byteLength} bytes)`);
    return videoPath;
  }

  async extractAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `audio_${uuidv4()}.mp3`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .audioQuality(2)
        .noVideo()
        .output(audioPath)
        .on('start', (commandLine) => {
          console.log('[INFO] FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`[INFO] Processing: ${progress.percent?.toFixed(2)}% done`);
        })
        .on('end', () => {
          console.log(`[INFO] Audio extraction completed: ${audioPath}`);
          resolve(audioPath);
        })
        .on('error', (err) => {
          console.error('[ERROR] FFmpeg error:', err);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  async uploadToSupabase(audioPath: string, userId: string, originalUrl: string): Promise<string> {
    try {
      // Read the audio file
      const audioBuffer = await fs.readFile(audioPath);
      const fileSize = audioBuffer.length;
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${userId}/${timestamp}_${uuidv4().slice(0, 8)}.mp3`;
      
      console.log(`[INFO] Uploading to Supabase Storage: ${filename}`);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filename, audioBuffer, {
          contentType: 'audio/mpeg',
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filename);

      console.log(`[INFO] File uploaded, public URL: ${publicUrl}`);

      // Create database record
      const displayFilename = `extracted_audio_${timestamp}.mp3`;
      
      const { data: dbData, error: dbError } = await supabase
        .from('audio_files')
        .insert({
          user_id: userId,
          filename: displayFilename,
          file_url: publicUrl,
          file_size: fileSize,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      console.log(`[INFO] Audio file record created with ID: ${dbData.id}`);
      return dbData.id;

    } catch (error) {
      console.error('[ERROR] Supabase upload error:', error);
      throw error;
    }
  }

  async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`[INFO] Cleaned up: ${filePath}`);
      } catch (error) {
        console.warn(`[WARNING] Failed to cleanup ${filePath}:`, error);
      }
    }
  }

  async processInstagramVideo(videoUrl: string, userId: string, originalUrl: string): Promise<string> {
    const filesToCleanup: string[] = [];
    
    try {
      // Download video
      const videoPath = await this.downloadVideo(videoUrl);
      filesToCleanup.push(videoPath);

      // Extract audio
      const audioPath = await this.extractAudio(videoPath);
      filesToCleanup.push(audioPath);

      // Upload to Supabase
      const audioFileId = await this.uploadToSupabase(audioPath, userId, originalUrl);

      return audioFileId;

    } finally {
      // Always cleanup temporary files
      await this.cleanup(filesToCleanup);
    }
  }
} 