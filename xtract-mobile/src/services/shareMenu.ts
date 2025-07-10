import ShareMenu from 'react-native-share-menu';
import { isValidVideoUrl, extractVideoUrl } from '../utils/videoUtils';

export interface ShareData {
  mimeType: string;
  data: string;
}

export interface VideoFileData {
  uri: string;
  type: string;
  name?: string;
}

export class ShareMenuService {
  static async getSharedData(): Promise<ShareData | null> {
    try {
      const data = await ShareMenu.getSharedData();
      return data || null;
    } catch (error) {
      console.warn('ShareMenu not available:', error);
      return null;
    }
  }

  // Check if shared data is a video file (new approach - no rate limiting!)
  static isVideoFile(sharedData: ShareData): boolean {
    return sharedData.mimeType.startsWith('video/');
  }

  // Extract video file information from shared data
  static getVideoFileData(sharedData: ShareData): VideoFileData | null {
    if (!this.isVideoFile(sharedData)) return null;
    
    try {
      // For video files, data will be a file URI
      return {
        uri: sharedData.data,
        type: sharedData.mimeType,
        name: `shared_video_${Date.now()}.mp4`
      };
    } catch (error) {
      console.error('Error parsing video file data:', error);
      return null;
    }
  }

  // Generic video URL validation - supports any video platform
  static isValidVideoUrl(url: string): boolean {
    return isValidVideoUrl(url);
  }

  static extractVideoUrl(text: string): string | null {
    return extractVideoUrl(text);
  }

  static async processSharedContent(): Promise<{ type: 'videoFile' | 'url', data: VideoFileData | string } | null> {
    const sharedData = await this.getSharedData();
    if (!sharedData) return null;
    
    // Priority 1: Check if it's a video file (avoids rate limiting!)
    if (this.isVideoFile(sharedData)) {
      const videoFileData = this.getVideoFileData(sharedData);
      if (videoFileData) {
        console.log('📹 Received video file via native sharing - no Instagram API calls needed!');
        return { type: 'videoFile', data: videoFileData };
      }
    }
    
    // Priority 2: Fallback to URL extraction (existing approach)
    const extractedUrl = this.extractVideoUrl(sharedData.data);
    if (extractedUrl && this.isValidVideoUrl(extractedUrl)) {
      console.log('🔗 Received video URL - will use API approach');
      return { type: 'url', data: extractedUrl };
    }
    
    return null;
  }

  // Legacy method for backward compatibility
  static async processSharedUrl(): Promise<string | null> {
    const result = await this.processSharedContent();
    if (result && result.type === 'url') {
      return result.data as string;
    }
    return null;
  }
} 