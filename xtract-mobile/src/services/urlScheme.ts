import { Linking } from 'react-native';
import { isValidVideoUrl } from '../utils/videoUtils';

export interface UrlHandler {
  handleUrl: (url: string) => void;
}

export class UrlSchemeService {
  private static urlHandler: UrlHandler | null = null;

  static setUrlHandler(handler: UrlHandler) {
    this.urlHandler = handler;
  }

  static initialize() {
    // Handle app launch from URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleIncomingUrl(url);
      }
    });

    // Handle app resume from URL
    const handleUrl = (event: { url: string }) => {
      this.handleIncomingUrl(event.url);
    };

    Linking.addEventListener('url', handleUrl);

    return () => {
      Linking.removeAllListeners('url');
    };
  }

  private static handleIncomingUrl(url: string) {
    console.log('Received URL:', url);
    
    // Handle direct video URLs (from Android intent filters)
    if (isValidVideoUrl(url)) {
      if (this.urlHandler) {
        this.urlHandler.handleUrl(url);
      }
    }
  }
} 