import express from 'express';
import { extractAudioFromUrl } from './extract';

export function setupRoutes(app: express.Application): void {
  const router = express.Router();

  // Mount audio extraction routes
  router.use('/extract', extractAudioFromUrl);

  // Mount router with /api prefix
  app.use('/api', router);
} 