import { NativeModules } from 'react-native';

const { SharedUrlModule } = NativeModules;

export class SharedUrlManager {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static listeners: Array<(url: string) => void> = [];

  /**
   * Initialize the shared URL manager
   */
  static initialize() {
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
          // Notify all listeners
          this.listeners.forEach(callback => callback(url));
        }
      } catch (error) {
        // Silently handle error
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
        return null;
      }

      const url = await SharedUrlModule.getStoredSharedUrl();
      if (url) {
        // Clear the stored URL after retrieving it
        await SharedUrlModule.clearStoredSharedUrl();
        return url;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear any pending shared URL using native module
   */
  static async clearPendingUrl() {
    try {
      if (!SharedUrlModule) {
        return;
      }

      await SharedUrlModule.clearStoredSharedUrl();
    } catch (error) {
      // Silently handle error
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