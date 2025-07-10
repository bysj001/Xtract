import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRoutes } from './routes';
import { setupCleanupJob } from './services/cleanup';
import { validateEnvironment } from './config/environment';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Validate environment variables
validateEnvironment();

// Middleware
app.use(  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://xtract-azh16the6-brians-projects-998b86c6.vercel.app'],
    credentials: true
  }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'xtract-audio-extraction',
    timestamp: new Date().toISOString()
  });
});

// Setup routes
setupRoutes(app);

// Setup cleanup job for temporary files
setupCleanupJob();

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

app.listen(PORT, () => {
  console.log(`🎵 Audio extraction service running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Direct mobile app integration - no backend proxy needed!`);
}); 