import { Request, Response, NextFunction } from 'express';

/**
 * Validate extraction request body
 */
export function validateExtractionRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { jobId, userId, videoStoragePath } = req.body;

  const errors: string[] = [];

  if (!jobId || typeof jobId !== 'string') {
    errors.push('jobId is required and must be a string');
  }

  if (!userId || typeof userId !== 'string') {
    errors.push('userId is required and must be a string');
  }

  if (!videoStoragePath || typeof videoStoragePath !== 'string') {
    errors.push('videoStoragePath is required and must be a string');
  }

  // Validate UUID format for jobId and userId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (jobId && !uuidRegex.test(jobId)) {
    errors.push('jobId must be a valid UUID');
  }

  if (userId && !uuidRegex.test(userId)) {
    errors.push('userId must be a valid UUID');
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: errors.join('; '),
    });
    return;
  }

  next();
}

/**
 * Validate job status request
 */
export function validateJobStatusRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { jobId } = req.params;

  if (!jobId) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'jobId parameter is required',
    });
    return;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(jobId)) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'jobId must be a valid UUID',
    });
    return;
  }

  next();
}

/**
 * Validate user audio files request
 */
export function validateUserRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'userId parameter is required',
    });
    return;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(userId)) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'userId must be a valid UUID',
    });
    return;
  }

  next();
}
