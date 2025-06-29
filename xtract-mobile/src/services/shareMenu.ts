import ShareMenu from 'react-native-share-menu';
import { ShareData } from '../types';

export class ShareMenuService {
  static async getSharedData(): Promise<ShareData | null> {
    try {
      // Check if getSharedData method exists
      if (typeof ShareMenu.getSharedData !== 'function') {
        console.warn('ShareMenu.getSharedData is not available');
        return null;
      }

      const sharedData = await ShareMenu.getSharedData();
      
      if (!sharedData) return null;

      // Handle different types of shared data
      if (sharedData.mimeType === 'text/plain' && sharedData.data) {
        // Check if it's a URL
        const urlPattern = /https?:\/\/(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)/i;
        
        if (urlPattern.test(sharedData.data)) {
          return {
            type: 'url',
            data: sharedData.data,
          };
        } else {
          return {
            type: 'text',
            data: sharedData.data,
          };
        }
      }

      return null;
    } catch (error) {
      console.warn('ShareMenu.getSharedData not supported or error occurred:', error);
      return null;
    }
  }

  static clearSharedData(): void {
    try {
      if (typeof ShareMenu.clearSharedData === 'function') {
        ShareMenu.clearSharedData();
      }
    } catch (error) {
      console.warn('ShareMenu.clearSharedData not supported:', error);
    }
  }

  static isValidVideoUrl(url: string): boolean {
    const patterns = [
      /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+/i,
      /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/video\/\d+/i,
      /https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/i,
      /https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/i,
      /https?:\/\/(vm\.)?tiktok\.com\/[a-zA-Z0-9]+/i,
    ];

    return patterns.some(pattern => pattern.test(url));
  }

  static extractVideoUrl(text: string): string | null {
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern);
    
    if (!urls) return null;

    for (const url of urls) {
      if (this.isValidVideoUrl(url)) {
        return url;
      }
    }

    return null;
  }
} 