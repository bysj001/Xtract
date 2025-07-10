import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Receiving FormData...');
    
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: any) {
      console.error('❌ Failed to parse FormData:', parseError.message);
      return NextResponse.json(
        { error: "invalidFormData", message: `Failed to parse form data: ${parseError.message}` },
        { status: 400 }
      );
    }
    const videoFile = formData.get('videoFile') as File;
    const userId = formData.get('userId') as string;
    const shortcode = formData.get('shortcode') as string;
    const instagramUrl = formData.get('instagramUrl') as string;
    const metadata = JSON.parse(formData.get('metadata') as string || '{}');
    const format = formData.get('format') as string || 'mp3';
    const quality = formData.get('quality') as string || 'medium';

    // Debug logging
    console.log('🔍 FormData debug:', {
      videoFile: videoFile ? `${videoFile.constructor.name} - ${videoFile.size} bytes - ${videoFile.type}` : 'null',
      userId: userId || 'null',
      shortcode: shortcode || 'null', 
      instagramUrl: instagramUrl || 'null',
      metadata: metadata ? 'present' : 'null',
      format: format || 'null',
      quality: quality || 'null'
    });

    // Validate required fields
    if (!videoFile || !userId || !shortcode || !instagramUrl) {
      console.error('❌ Missing parameters:', {
        hasVideoFile: !!videoFile,
        hasUserId: !!userId,
        hasShortcode: !!shortcode, 
        hasInstagramUrl: !!instagramUrl
      });
      return NextResponse.json(
        { error: "missingParameters", message: "Video file, user ID, shortcode, and Instagram URL are required" },
        { status: 400 }
      );
    }

    // Check video file size (Vercel limit is around 4.5MB for Pro, 1MB for Hobby)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB limit for now
    if (videoFile.size > maxSizeBytes) {
      console.error(`❌ Video file too large: ${videoFile.size} bytes (max: ${maxSizeBytes})`);
      return NextResponse.json(
        { error: "fileTooLarge", message: `Video file is too large (${Math.round(videoFile.size / 1024 / 1024)}MB). Maximum size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    console.log(`✅ Video file validation passed: ${videoFile.name}, ${videoFile.size} bytes, ${videoFile.type}`);

    // Create processing job in database
    console.log(`Creating processing job for user ${userId}, shortcode: ${shortcode}`);
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('processing_jobs')
      .insert({
        user_id: userId,
        original_url: instagramUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create processing job:', jobError);
      throw new Error('Failed to create processing job');
    }

    const jobId = jobData.id;

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${shortcode}_${timestamp}.mp4`;

      // Convert file to buffer
      const videoBuffer = await videoFile.arrayBuffer();
      const videoFileData = new Uint8Array(videoBuffer);

      console.log(`Uploading video to Supabase Storage: ${filename}`);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.VIDEO_TEMP)
        .upload(filename, videoFileData, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        
        await supabaseAdmin
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error_message: `Failed to upload to storage: ${uploadError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
      }

      console.log(`Video uploaded successfully: ${uploadData.path}`);

      // Update processing job with video URL
      await supabaseAdmin
        .from('processing_jobs')
        .update({ 
          video_url: uploadData.path,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(STORAGE_BUCKETS.VIDEO_TEMP)
        .getPublicUrl(filename);

      const publicUrl = urlData.publicUrl;

      // Update processing job to 'processing' status
      await supabaseAdmin
        .from('processing_jobs')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Notify Railway backend for audio extraction
      const railwayUrl = process.env.RAILWAY_BACKEND_URL;
      let extractionStarted = false;
      
      if (railwayUrl) {
        try {
          console.log(`Notifying Railway backend: ${railwayUrl}`);
          const webhookResponse = await fetch(`${railwayUrl}/api/extract/from-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RAILWAY_WEBHOOK_SECRET || ''}`
            },
            body: JSON.stringify({
              jobId,
              userId,
              videoUrl: publicUrl,
              filename,
              shortcode,
              originalUrl: instagramUrl,
              format,
              quality,
              metadata
            })
          });

          if (webhookResponse.ok) {
            extractionStarted = true;
            console.log('Railway backend notified successfully');
          } else {
            console.warn(`Railway notification failed: ${webhookResponse.statusText}`);
            // Don't fail the job, but log the warning
          }
        } catch (error) {
          console.warn('Failed to notify Railway backend:', error);
          // Don't fail the job, but log the warning
        }
      }

      // Schedule video cleanup (24 hours)
      setTimeout(async () => {
        try {
          await supabaseAdmin.storage
            .from(STORAGE_BUCKETS.VIDEO_TEMP)
            .remove([filename]);
          console.log(`Cleaned up temporary file: ${filename}`);
        } catch (error) {
          console.error(`Failed to cleanup file ${filename}:`, error);
        }
      }, 24 * 60 * 60 * 1000); // 24 hours

      // Return success response in the format the mobile app expects
      return NextResponse.json({
        success: true,
        data: {
          jobId,
          extractionStarted,
          metadata
        },
        message: railwayUrl && extractionStarted
          ? "Video uploaded and audio extraction started" 
          : "Video uploaded successfully"
      });

    } catch (processingError: any) {
      // Update job status to failed if processing fails
      await supabaseAdmin
        .from('processing_jobs')
        .update({ 
          status: 'failed', 
          error_message: processingError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      throw processingError;
    }

  } catch (error: any) {
    console.error("Video processing error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "serverError", 
        message: error.message 
      },
      { status: 500 }
    );
  }
} 