import express from 'express';
import { AudioExtractionService } from '../services/audioExtraction';
import { SupabaseService } from '../services/supabase';
import {
  validateExtractionRequest,
  validateJobStatusRequest,
  validateUserRequest,
} from '../middleware/validation';

const router = express.Router();
const audioService = new AudioExtractionService();
const supabaseService = new SupabaseService();

/**
 * POST /api/extract
 * 
 * Main extraction endpoint - processes video from Supabase storage
 * Called by mobile app after uploading video to Supabase
 * 
 * Request body:
 * - jobId: UUID of the processing job (created by mobile app)
 * - userId: UUID of the authenticated user
 * - videoStoragePath: Path to video in Supabase storage
 * - originalFilename: Optional original filename for title
 */
router.post('/', validateExtractionRequest, async (req, res) => {
  try {
    const { jobId, userId, videoStoragePath, originalFilename } = req.body;

    console.log(`🎬 Received extraction request`);
    console.log(`   Job: ${jobId}`);
    console.log(`   User: ${userId}`);
    console.log(`   Video: ${videoStoragePath}`);

    const result = await audioService.extractAudio({
      jobId,
      userId,
      videoStoragePath,
      originalFilename,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Extraction error:', error);

    return res.status(500).json({
      success: false,
      error: 'extraction_failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/extract/status/:jobId
 * 
 * Check the status of an extraction job
 */
router.get('/status/:jobId', validateJobStatusRequest, async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await audioService.getJobStatus(jobId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'job_not_found',
        message: 'Processing job not found',
      });
    }

    return res.json({
      success: true,
      data: {
        jobId: status.id,
        status: status.status,
        audioFileId: status.audio_file_id,
        errorMessage: status.error_message,
        createdAt: status.created_at,
        updatedAt: status.updated_at,
      },
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

/**
 * GET /api/extract/download/:audioFileId
 * 
 * Get signed download URL for an audio file
 */
router.get('/download/:audioFileId', async (req, res) => {
  try {
    const { audioFileId } = req.params;
    const downloadUrl = await audioService.getAudioDownloadUrl(audioFileId);

    if (!downloadUrl) {
      return res.status(404).json({
        success: false,
        error: 'file_not_found',
        message: 'Audio file not found',
      });
    }

    return res.json({
      success: true,
      data: {
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Download URL error:', error);

    return res.status(500).json({
      success: false,
      error: 'download_failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/extract/user/:userId/files
 * 
 * Get all audio files for a user
 */
router.get('/user/:userId/files', validateUserRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const files = await supabaseService.getUserAudioFiles(userId);

    return res.json({
      success: true,
      data: files,
    });
  } catch (error: any) {
    console.error('Get user files error:', error);

    return res.status(500).json({
      success: false,
      error: 'get_files_failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/extract/user/:userId/unsynced
 * 
 * Get unsynced audio files for desktop sync
 */
router.get('/user/:userId/unsynced', validateUserRequest, async (req, res) => {
  try {
    const { userId } = req.params;
    const files = await supabaseService.getUnsyncedAudioFiles(userId);

    return res.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error: any) {
    console.error('Get unsynced files error:', error);

    return res.status(500).json({
      success: false,
      error: 'get_unsynced_failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/extract/mark-synced
 * 
 * Mark audio files as synced to desktop
 */
router.post('/mark-synced', async (req, res) => {
  try {
    const { audioFileIds } = req.body;

    if (!Array.isArray(audioFileIds) || audioFileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'validation_error',
        message: 'audioFileIds must be a non-empty array',
      });
    }

    await supabaseService.markAsSynced(audioFileIds);

    return res.json({
      success: true,
      message: `Marked ${audioFileIds.length} files as synced`,
    });
  } catch (error: any) {
    console.error('Mark synced error:', error);

    return res.status(500).json({
      success: false,
      error: 'mark_synced_failed',
      message: error.message,
    });
  }
});

export { router as extractRouter };
