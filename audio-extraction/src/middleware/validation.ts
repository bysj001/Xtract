import express from 'express';

export function validateExtractionRequest(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const { videoUrl, shortcode, userId } = req.body;

  // Validate required fields
  if (!videoUrl || typeof videoUrl !== 'string') {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'videoUrl is required and must be a string',
    });
    return;
  }

  if (!shortcode || typeof shortcode !== 'string') {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'shortcode is required and must be a string',
    });
    return;
  }

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'userId is required and must be a string',
    });
    return;
  }

  // Validate URL format
  try {
    new URL(videoUrl);
  } catch {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'videoUrl must be a valid URL',
    });
    return;
  }

  // Validate optional fields
  const { format, quality } = req.body;

  if (format && !['mp3', 'wav', 'aac', 'ogg'].includes(format)) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'format must be one of: mp3, wav, aac, ogg',
    });
    return;
  }

  if (quality && !['low', 'medium', 'high'].includes(quality)) {
    res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'quality must be one of: low, medium, high',
    });
    return;
  }

  next();
} 