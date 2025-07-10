import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/supabase";
import { getInstagramPostGraphQL } from "../instagram/p/[shortcode]/utils";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "missingUrl", message: "Instagram URL is required" },
        { status: 400 }
      );
    }

    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)\/?/);
    if (!shortcodeMatch || !shortcodeMatch[2]) {
      return NextResponse.json(
        { error: "invalidUrl", message: "Invalid Instagram URL" },
        { status: 400 }
      );
    }

    const shortcode = shortcodeMatch[2];

    // Fetch Instagram post data
    console.log(`Fetching Instagram post data for shortcode: ${shortcode}`);
    const response = await getInstagramPostGraphQL({ shortcode });

    if (response.status !== 200) {
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
      return NextResponse.json(
        { error: "notFound", message: "Post not found" },
        { status: 404 }
      );
    }

    if (!data.xdt_shortcode_media.is_video) {
      return NextResponse.json(
        { error: "notVideo", message: "Post is not a video" },
        { status: 400 }
      );
    }

    const videoUrl = data.xdt_shortcode_media.video_url;
    if (!videoUrl) {
      return NextResponse.json(
        { error: "noVideoUrl", message: "Video URL not found" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${shortcode}_${timestamp}.mp4`;

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
    let extractionStatus = 'pending';
    
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
            originalUrl: url,
            metadata: {
              title: data.xdt_shortcode_media.edge_media_to_caption?.edges[0]?.node?.text || '',
              username: data.xdt_shortcode_media.owner?.username || '',
              duration: data.xdt_shortcode_media.video_duration || 0
            }
          })
        });

        if (webhookResponse.ok) {
          extractionStatus = 'started';
          console.log('Railway backend notified successfully');
        } else {
          console.warn(`Railway notification failed: ${webhookResponse.statusText}`);
        }
      } catch (error) {
        console.warn('Failed to notify Railway backend:', error);
        // Don't fail the request if webhook fails
      }
    }

    // Schedule cleanup (24 hours)
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
      data: {
        shortcode,
        filename,
        videoUrl: publicUrl,
        extractionStatus,
        metadata: {
          title: data.xdt_shortcode_media.edge_media_to_caption?.edges[0]?.node?.text || '',
          username: data.xdt_shortcode_media.owner?.username || '',
          duration: data.xdt_shortcode_media.video_duration || 0,
          thumbnail: data.xdt_shortcode_media.display_url || ''
        }
      },
      message: railwayUrl 
        ? "Video processed and audio extraction initiated" 
        : "Video processed successfully"
    });

  } catch (error: any) {
    console.error("Instagram processing error:", error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: 500 }
    );
  }
} 