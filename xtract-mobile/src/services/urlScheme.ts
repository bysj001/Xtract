import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class URLSchemeService {
  private static listeners: Array<(url: string) => void> = [];

  static initialize() {
    // Handle app launch from URL scheme
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleURL(url);
      }
    });

    // Handle URL scheme when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      this.handleURL(event.url);
    });

    return subscription;
  }

  static addListener(callback: (url: string) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private static handleURL(url: string) {
    console.log('Received URL:', url);
    
    // Parse xtract://share?url=... format
    if (url.startsWith('xtract://share')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const sharedUrl = urlParams.get('url');
      
      if (sharedUrl) {
        // Store the shared URL for the app to handle
        AsyncStorage.setItem('pending_shared_url', decodeURIComponent(sharedUrl));
        
        // Notify listeners
        this.listeners.forEach(listener => {
          listener(decodeURIComponent(sharedUrl));
        });
      }
    }
  }

  static async getPendingSharedURL(): Promise<string | null> {
    try {
      const url = await AsyncStorage.getItem('pending_shared_url');
      if (url) {
        // Clear it after reading
        await AsyncStorage.removeItem('pending_shared_url');
        return url;
      }
      return null;
    } catch (error) {
      console.error('Error getting pending shared URL:', error);
      return null;
    }
  }

  // For iOS: Check UserDefaults for shared data from Share Extension
  static async checkSharedUserDefaults(): Promise<string | null> {
    try {
      // This would require a native module to read from UserDefaults
      // For now, we'll rely on the URL scheme approach
      return null;
    } catch (error) {
      console.error('Error checking shared UserDefaults:', error);
      return null;
    }
  }
} 