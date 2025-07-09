import cron from 'node-cron';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/environment';

export function setupCleanupJob(): void {
  // Run cleanup every hour (or based on config)
  const cronPattern = `0 */${config.CLEANUP_INTERVAL_HOURS} * * *`;
  
  cron.schedule(cronPattern, async () => {
    console.log('🧹 Starting cleanup job...');
    
    try {
      await cleanupTempFiles();
      console.log('✅ Cleanup job completed successfully');
    } catch (error) {
      console.error('❌ Cleanup job failed:', error);
    }
  });

  console.log(`🗓️ Cleanup job scheduled to run every ${config.CLEANUP_INTERVAL_HOURS} hour(s)`);
}

async function cleanupTempFiles(): Promise<void> {
  const tempDir = config.TEMP_DIR;
  const retentionMs = config.FILE_RETENTION_HOURS * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = await fs.readdir(tempDir);
    let removedCount = 0;
    let totalSize = 0;

    for (const filename of files) {
      const filePath = path.join(tempDir, filename);
      
      try {
        const stats = await fs.stat(filePath);
        
        // Check if file is older than retention period
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > retentionMs) {
          await fs.unlink(filePath);
          removedCount++;
          totalSize += stats.size;
          console.log(`🗑️ Removed old file: ${filename} (${formatBytes(stats.size)})`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not process file ${filename}:`, error);
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} files, freed ${formatBytes(totalSize)}`);
    } else {
      console.log('🧹 No old files to clean up');
    }
  } catch (error) {
    console.error('Failed to read temp directory:', error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Export for manual cleanup if needed
export { cleanupTempFiles }; 