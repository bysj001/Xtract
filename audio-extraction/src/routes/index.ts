import { Express } from 'express';
import { extractRouter } from './extract';

export function setupRoutes(app: Express): void {
  // Mount extraction routes
  app.use('/api/extract', extractRouter);

  console.log('📍 Routes configured:');
  console.log('   POST /api/extract - Process video and extract audio');
  console.log('   GET  /api/extract/status/:jobId - Check job status');
  console.log('   GET  /api/extract/download/:audioFileId - Get download URL');
  console.log('   GET  /api/extract/user/:userId/files - Get user audio files');
  console.log('   GET  /api/extract/user/:userId/unsynced - Get unsynced files');
  console.log('   POST /api/extract/mark-synced - Mark files as synced');
}
