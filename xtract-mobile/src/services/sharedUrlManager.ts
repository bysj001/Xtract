import { NativeModules } from 'react-native';

const { SharedUrlModule } = NativeModules;

export class SharedUrlManager {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static listeners: Array<(url: string) => void> = [];

  /**
   * Initialize the shared URL manager
   */
  static initialize() {
    console.log('SharedUrlManager: Initializing with native module...');
    
    // Start checking for shared URLs periodically
    this.startChecking();

    return () => {
      this.stopChecking();
    };
  }

  /**
   * Start checking for shared URLs every 1 second
   */
  private static startChecking() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      try {
        const url = await this.getPendingSharedUrl();
        if (url) {
          console.log('SharedUrlManager: Found shared URL:', url);
          // Notify all listeners
          this.listeners.forEach(callback => callback(url));
        }
      } catch (error) {
        console.error('SharedUrlManager: Error checking for shared URL:', error);
      }
    }, 1000); // Check every second
  }

  /**
   * Stop checking for shared URLs
   */
  private static stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get any pending shared URL and clear it using native module
   */
  static async getPendingSharedUrl(): Promise<string | null> {
    try {
      if (!SharedUrlModule) {
        console.warn('SharedUrlManager: Native module not available');
        return null;
      }

      const url = await SharedUrlModule.getStoredSharedUrl();
      if (url) {
        // Clear the stored URL after retrieving it
        await SharedUrlModule.clearStoredSharedUrl();
        console.log('SharedUrlManager: Retrieved and cleared stored URL:', url);
        return url;
      }

      return null;
    } catch (error) {
      console.error('SharedUrlManager: Error retrieving shared URL:', error);
      return null;
    }
  }

  /**
   * Clear any pending shared URL using native module
   */
  static async clearPendingUrl() {
    try {
      if (!SharedUrlModule) {
        console.warn('SharedUrlManager: Native module not available');
        return;
      }

      await SharedUrlModule.clearStoredSharedUrl();
      console.log('SharedUrlManager: Cleared stored URL');
    } catch (error) {
      console.error('SharedUrlManager: Error clearing shared URL:', error);
    }
  }

  /**
   * Add listener for shared URLs
   */
  static addPendingUrlListener(callback: (url: string) => void) {
    this.listeners.push(callback);
    
    return {
      remove: () => {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      }
    };
  }
} 