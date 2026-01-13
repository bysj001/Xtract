import cron from 'node-cron';
import { AudioExtractionService } from './audioExtraction';
import { config } from '../config/environment';

let cleanupService: AudioExtractionService | null = null;

/**
 * Setup periodic cleanup job for temporary files
 */
export function setupCleanupJob(): void {
  cleanupService = new AudioExtractionService();
  
  // Run cleanup every N minutes (default: 5 minutes)
  const intervalMinutes = config.CLEANUP_INTERVAL_MINUTES;
  const cronExpression = `*/${intervalMinutes} * * * *`;
  
  cron.schedule(cronExpression, async () => {
    console.log('🧹 Running scheduled temp file cleanup...');
    try {
      await cleanupService?.cleanupOldTempFiles();
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  });

  console.log(`🕐 Cleanup job scheduled every ${intervalMinutes} minutes`);
}
