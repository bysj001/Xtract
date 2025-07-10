import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, shortcode } = await request.json();

    if (!videoUrl || !shortcode) {
      return NextResponse.json(
        { error: "missingParameters", message: "videoUrl and shortcode are required" },
        { status: 400 }
      );
    }

    // Validate the URL
    if (!videoUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "invalidUrl", message: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${shortcode}_${timestamp}.mp4`;

    // Fetch the video from Instagram
    console.log(`Fetching video from: ${videoUrl}`);
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
      throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
    }

    console.log(`Video uploaded successfully: ${uploadData.path}`);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKETS.VIDEO_TEMP)
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Notify Railway backend (if configured)
    const railwayUrl = process.env.RAILWAY_BACKEND_URL;
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
            videoUrl: publicUrl,
            filename,
            shortcode,
            originalUrl: videoUrl
          })
        });

        if (!webhookResponse.ok) {
          console.warn(`Railway notification failed: ${webhookResponse.statusText}`);
        } else {
          console.log('Railway backend notified successfully');
        }
      } catch (error) {
        console.warn('Failed to notify Railway backend:', error);
        // Don't fail the request if webhook fails
      }
    }

    // Schedule cleanup (24 hours)
    // Note: In production, you might want to use a proper job queue
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

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      filename,
      message: "Video uploaded successfully and extraction initiated"
    });

  } catch (error: any) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: 500 }
    );
  }
} 