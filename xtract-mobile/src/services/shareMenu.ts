import ShareMenu from 'react-native-share-menu';
import { isValidVideoUrl, extractVideoUrl } from '../utils/videoUtils';

export interface ShareData {
  mimeType: string;
  data: string;
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

  // Generic video URL validation - supports any video platform
  static isValidVideoUrl(url: string): boolean {
    return isValidVideoUrl(url);
  }

  static extractVideoUrl(text: string): string | null {
    return extractVideoUrl(text);
  }

  static async processSharedUrl(): Promise<string | null> {
    const sharedData = await this.getSharedData();
    if (!sharedData) return null;
    
    const extractedUrl = this.extractVideoUrl(sharedData.data);
    
    if (extractedUrl && this.isValidVideoUrl(extractedUrl)) {
      return extractedUrl;
    }
    
    return null;
  }
} 