import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { getInstagramPostGraphQL } from "../instagram/p/[shortcode]/utils";

export async function POST(request: NextRequest) {
  try {
    const { instagramUrl, userId, format = 'mp3', quality = 'medium' } = await request.json();

    // Validate required fields
    if (!instagramUrl || !userId) {
      return NextResponse.json(
        { error: "missingParameters", message: "Instagram URL and User ID are required" },
        { status: 400 }
      );
    }

    // Extract shortcode from URL
    const shortcodeMatch = instagramUrl.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)\/?/);
    if (!shortcodeMatch || !shortcodeMatch[2]) {
      return NextResponse.json(
        { error: "invalidUrl", message: "Invalid Instagram URL" },
        { status: 400 }
      );
    }

    const shortcode = shortcodeMatch[2];

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
      // Fetch Instagram post data
      console.log(`Fetching Instagram post data for shortcode: ${shortcode}`);
      const response = await getInstagramPostGraphQL({ shortcode });

      if (response.status !== 200) {
        // Update job status to failed
        await supabaseAdmin
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error_message: `Instagram API error: ${response.status}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (response.status === 404) {
          return NextResponse.json(
            { error: "notFound", message: "Post not found" },
            { status: 404 }
          );
        }
        if (response.status === 429 || response.status === 401) {
          return NextResponse.json(
            { error: "rateLimited", message: "Too many requests, try again later" },
            { status: 429 }
          );
        }
        throw new Error("Failed to fetch Instagram post");
      }

      const { data } = await response.json();
      
      if (!data.xdt_shortcode_media) {
        await supabaseAdmin
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error_message: 'Post not found',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return NextResponse.json(
          { error: "notFound", message: "Post not found" },
          { status: 404 }
        );
      }

      if (!data.xdt_shortcode_media.is_video) {
        await supabaseAdmin
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error_message: 'Post is not a video',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return NextResponse.json(
          { error: "notVideo", message: "Post is not a video" },
          { status: 400 }
        );
      }

      const videoUrl = data.xdt_shortcode_media.video_url;
      if (!videoUrl) {
        await supabaseAdmin
          .from('processing_jobs')
          .update({ 
            status: 'failed', 
            error_message: 'Video URL not found',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return NextResponse.json(
          { error: "noVideoUrl", message: "Video URL not found" },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}_${shortcode}_${timestamp}.mp4`;

      // Fetch the video from Instagram
      console.log(`Fetching video from Instagram: ${videoUrl}`);
      const videoResponse = await fetch(videoUrl);

      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }

      // Get video as buffer
      const videoBuffer = await videoResponse.arrayBuffer();
      const videoFile = new Uint8Array(videoBuffer);

      console.log(`Uploading video to Supabase Storage: ${filename}`);
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.VIDEO_TEMP)
        .upload(filename, videoFile, {
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
              metadata: {
                title: data.xdt_shortcode_media.edge_media_to_caption?.edges[0]?.node?.text || '',
                username: data.xdt_shortcode_media.owner?.username || '',
                duration: data.xdt_shortcode_media.video_duration || 0,
                thumbnail: data.xdt_shortcode_media.display_url || ''
              }
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
          metadata: {
            title: data.xdt_shortcode_media.edge_media_to_caption?.edges[0]?.node?.text || '',
            username: data.xdt_shortcode_media.owner?.username || '',
            duration: data.xdt_shortcode_media.video_duration || 0
          }
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
    console.error("Audio extraction error:", error);
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