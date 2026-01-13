import ShareMenu from 'react-native-share-menu';
import { VideoFileData } from '../types';

export interface ShareData {
  mimeType: string;
  data: string;
  extraData?: any;
}

/**
 * Service for handling shared content from other apps
 * ONLY accepts video files - no URL processing
 */
export class ShareMenuService {
  /**
   * Get shared data from the share menu
   */
  static async getSharedData(): Promise<ShareData | null> {
    try {
      const data = await ShareMenu.getSharedData();
      return data || null;
    } catch (error) {
      console.warn('ShareMenu not available:', error);
      return null;
    }
  }

  /**
   * Check if the shared data is a video file
   */
  static isVideoFile(sharedData: ShareData): boolean {
    const mimeType = sharedData.mimeType?.toLowerCase() || '';
    return (
      mimeType.startsWith('video/') ||
      mimeType === 'public.movie' ||
      mimeType === 'com.apple.quicktime-movie'
    );
  }

  /**
   * Extract video file information from shared data
   */
  static getVideoFileData(sharedData: ShareData): VideoFileData | null {
    if (!this.isVideoFile(sharedData)) {
      return null;
    }

    try {
      // For video files, data contains the file URI
      const uri = sharedData.data;
      if (!uri) {
        console.error('No video URI in shared data');
        return null;
      }

      // Extract filename from URI or generate one
      let filename = 'shared_video.mp4';
      try {
        const uriParts = uri.split('/');
        const lastPart = uriParts[uriParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          filename = decodeURIComponent(lastPart);
        }
      } catch (e) {
        // Use default filename
      }

      return {
        uri,
        type: sharedData.mimeType || 'video/mp4',
        name: filename,
      };
    } catch (error) {
      console.error('Error parsing video file data:', error);
      return null;
    }
  }

  /**
   * Process shared content - ONLY accepts video files
   * Returns null if content is not a video file
   */
  static async processSharedContent(): Promise<VideoFileData | null> {
    const sharedData = await this.getSharedData();
    
    if (!sharedData) {
      console.log('❌ No shared data received');
      return null;
    }

    console.log(`📱 Received shared content:`);
    console.log(`   Type: ${sharedData.mimeType}`);
    console.log(`   Data: ${sharedData.data?.substring(0, 100)}...`);

    // Only accept video files
    if (this.isVideoFile(sharedData)) {
      const videoData = this.getVideoFileData(sharedData);
      if (videoData) {
        console.log('📹 ✅ Valid video file received');
        console.log(`   Name: ${videoData.name}`);
        return videoData;
      }
    }

    console.log('❌ Shared content is not a video file');
    console.log('💡 To extract audio from Instagram:');
    console.log('   1. Download the video to your device first');
    console.log('   2. Share the saved video file with Xtract');
    
    return null;
  }

  /**
   * Clear any pending shared data
   */
  static async clearSharedData(): Promise<void> {
    try {
      // Some implementations of react-native-share-menu support clearing
      // If not available, this is a no-op
    } catch (error) {
      // Ignore
    }
  }
}
