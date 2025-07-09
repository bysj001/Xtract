import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

export class AudioProcessor {
  private tempDir: string;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.tempDir = '/tmp';
    this.baseUrl = baseUrl || 'http://localhost:3000'; // Default for local dev
    
    this.setupFFmpegSync();
  }

  private setupFFmpegSync() {
    console.log('[INFO] Setting up FFmpeg...');
    
    // Try ffmpeg-static first
    if (ffmpegStatic && typeof ffmpegStatic === 'string') {
      try {
        const ffmpegStaticPath = ffmpegStatic;
        console.log(`[INFO] Checking ffmpeg-static path: ${ffmpegStaticPath}`);
        
        // Check if file exists and is executable
        const fs = require('fs');
        fs.accessSync(ffmpegStaticPath, fs.constants.F_OK | fs.constants.X_OK);
        
        ffmpeg.setFfmpegPath(ffmpegStaticPath);
        console.log(`[SUCCESS] Using ffmpeg-static: ${ffmpegStaticPath}`);
        return;
      } catch (error) {
        console.warn(`[WARNING] ffmpeg-static not accessible (${ffmpegStatic}):`, error);
      }
    }
    
    // Try common system paths
    const systemPaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg', 
      '/bin/ffmpeg',
    ];
    
    const fs = require('fs');
    for (const ffmpegPath of systemPaths) {
      try {
        fs.accessSync(ffmpegPath, fs.constants.F_OK);
        ffmpeg.setFfmpegPath(ffmpegPath);
        console.log(`[SUCCESS] Using system ffmpeg: ${ffmpegPath}`);
        return;
      } catch (error) {
        console.log(`[INFO] FFmpeg not found at: ${ffmpegPath}`);
      }
    }
    
    // Fallback to 'ffmpeg' (let the system handle it - Nixpacks should install it)
    console.log('[INFO] Using system PATH ffmpeg (Nixpacks should have installed it)');
    ffmpeg.setFfmpegPath('ffmpeg');
  }

  async downloadVideo(videoUrl: string): Promise<string> {
    console.log(`[INFO] Downloading video directly from: ${videoUrl.substring(0, 50)}...`);

    // Direct download from Instagram CDN (server-side, no proxy needed)
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36',
        'Accept': 'video/mp4,video/*,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const videoBuffer = await response.arrayBuffer();
    const videoPath = path.join(this.tempDir, `video_${uuidv4()}.mp4`);
    
    await fs.writeFile(videoPath, Buffer.from(videoBuffer));
    
    console.log(`[INFO] Video downloaded to temp file: ${videoPath} (${videoBuffer.byteLength} bytes)`);
    return videoPath;
  }

  async extractAudio(videoPath: string): Promise<string> {
    const audioPath = path.join(this.tempDir, `audio_${uuidv4()}.mp3`);

    return new Promise((resolve, reject) => {
      console.log(`[INFO] Starting audio extraction from: ${videoPath}`);
      
      ffmpeg(videoPath)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .noVideo()
        .output(audioPath)
        .on('start', (commandLine) => {
          console.log('[INFO] FFmpeg command:', commandLine);
        })
        .on('end', () => {
          console.log(`[INFO] Audio extraction completed: ${audioPath}`);
          resolve(audioPath);
        })
        .on('error', (err) => {
          console.error('[ERROR] FFmpeg error:', err.message);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .run();
    });
  }

  async uploadToSupabase(audioPath: string, userId: string): Promise<string> {
    try {
      const audioBuffer = await fs.readFile(audioPath);
      const fileSize = audioBuffer.length;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${userId}/${timestamp}_${uuidv4().slice(0, 8)}.mp3`;
      
      console.log(`[INFO] Uploading to Supabase Storage: ${filename}`);
      
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filename, audioBuffer, { contentType: 'audio/mpeg' });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filename);

      console.log(`[INFO] File uploaded, public URL: ${publicUrl}`);

      const displayFilename = `xtract_audio_${timestamp}.mp3`;
      
      const { data: dbData, error: dbError } = await supabase
        .from('audio_files')
        .insert({
          user_id: userId,
          filename: displayFilename,
          file_url: publicUrl,
          file_size: fileSize,
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
        console.log(`[INFO] Cleaned up temp file: ${filePath}`);
      } catch (error) {
        console.warn(`[WARNING] Failed to cleanup ${filePath}:`, error);
      }
    }
  }

  async processInstagramVideo(videoUrl: string, userId: string): Promise<string> {
    const filesToCleanup: string[] = [];
    
    try {
      const videoPath = await this.downloadVideo(videoUrl);
      filesToCleanup.push(videoPath);

      const audioPath = await this.extractAudio(videoPath);
      filesToCleanup.push(audioPath);

      const audioFileId = await this.uploadToSupabase(audioPath, userId);

      return audioFileId;

    } finally {
      await this.cleanup(filesToCleanup);
    }
  }
} 