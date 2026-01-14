import express from 'express';
import cors from 'cors';
import { setupRoutes } from './routes';
import { setupCleanupJob } from './services/cleanup';
import { config } from './config/environment';

// Config is already validated in environment.ts (dotenv loaded there too)

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.ALLOWED_ORIGINS.includes('*')
      ? true
      : config.ALLOWED_ORIGINS,
    credentials: true,
  })
);

// Body parsing - increased limits for video metadata
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
    );
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'xtract-audio-extraction',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// Setup API routes
setupRoutes(app);

// Setup cleanup job for temporary files
setupCleanupJob();

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message:
        config.NODE_ENV === 'development'
          ? error.message
          : 'An unexpected error occurred',
    });
  }
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'not_found',
    message: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// Start server
app.listen(config.PORT, () => {
  console.log('');
  console.log('🎵 ═══════════════════════════════════════════════════════');
  console.log('🎵  XTRACT AUDIO EXTRACTION SERVICE v2.0');
  console.log('🎵 ═══════════════════════════════════════════════════════');
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🚀 Server running on port ${config.PORT}`);
  console.log(`📁 Temp directory: ${config.TEMP_DIR}`);
  console.log(`📦 Max file size: ${config.MAX_FILE_SIZE_MB} MB`);
  console.log('🎵 ═══════════════════════════════════════════════════════');
  console.log('');
});
