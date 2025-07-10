import express from 'express';
import { AudioExtractionService } from '../services/audioExtraction';
import { validateExtractionRequest, validateSupabaseExtractionRequest } from '../middleware/validation';

const router = express.Router();
const audioService = new AudioExtractionService();

// NEW: POST /api/extract/from-supabase
// Process video directly from Supabase storage (native sharing flow)
router.post('/from-supabase', validateSupabaseExtractionRequest, async (req, res) => {
  try {
    const { jobId, userId, videoPath, format = 'mp3', quality = 'medium', videoTitle } = req.body;

    console.log(`🎬 Starting Supabase video processing for job: ${jobId}, user: ${userId}`);
    console.log(`📁 Video path: ${videoPath}`);

    const result = await audioService.extractAudioFromSupabase({
      jobId,
      userId,
      videoPath,
      format,
      quality,
      videoTitle,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Supabase audio extraction error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'extraction_failed',
      message: error.message,
    });
  }
});

// UPDATED: POST /api/extract/from-url
// Extract audio from a video URL (legacy method for manual URL input)
router.post('/from-url', validateExtractionRequest, async (req, res) => {
  try {
    const { jobId, videoUrl, userId, format = 'mp3', quality = 'medium', videoTitle } = req.body;

    console.log(`🔗 Starting URL video processing for job: ${jobId || 'legacy'}, user: ${userId}`);

    const result = await audioService.extractAudioFromUrl({
      jobId,
      videoUrl,
      userId,
      format,
      quality,
      videoTitle,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('URL audio extraction error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'extraction_failed',
      message: error.message,
    });
  }
});

// GET /api/extract/status/:jobId
// Check the status of an extraction job
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await audioService.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'job_not_found',
        message: 'Job not found or expired',
      });
    }

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'status_check_failed',
      message: error.message,
    });
  }
});

// GET /api/extract/download/:jobId
// Redirect to Supabase URL for audio file download
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const supabaseUrl = await audioService.getSupabaseDownloadUrl(jobId);

    if (!supabaseUrl) {
      return res.status(404).json({
        success: false,
        error: 'file_not_found',
        message: 'Audio file not found or expired',
      });
    }

    // Redirect to Supabase storage URL
    return res.redirect(302, supabaseUrl);
  } catch (error: any) {
    console.error('Download error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'download_failed',
      message: error.message,
    });
  }
});

// GET /api/extract/download-url/:jobId
// Get direct Supabase URL for download (for API usage)
router.get('/download-url/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const supabaseUrl = await audioService.getSupabaseDownloadUrl(jobId);

    if (!supabaseUrl) {
      return res.status(404).json({
        success: false,
        error: 'file_not_found',
        message: 'Audio file not found or expired',
      });
    }

    return res.json({
      success: true,
      data: {
        downloadUrl: supabaseUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      },
    });
  } catch (error: any) {
    console.error('Download URL error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'download_url_failed',
      message: error.message,
    });
  }
});

export { router as extractAudioFromUrl }; 