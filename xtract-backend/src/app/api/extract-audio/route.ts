import { NextRequest, NextResponse } from "next/server";
import { getPostShortcode } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { instagramUrl, userId, format = 'mp3', quality = 'medium' } = await request.json();

    if (!instagramUrl) {
      return NextResponse.json(
        { error: "missingUrl", message: "Instagram URL is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "missingUserId", message: "User ID is required" },
        { status: 400 }
      );
    }

    // Extract shortcode from Instagram URL
    const shortcode = getPostShortcode(instagramUrl);
    if (!shortcode) {
      return NextResponse.json(
        { error: "invalidUrl", message: "Invalid Instagram URL" },
        { status: 400 }
      );
    }

    // Step 1: Get Instagram post data
    const postResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/instagram/p/${shortcode}`,
      { method: 'GET' }
    );

    if (!postResponse.ok) {
      const errorData = await postResponse.json();
      return NextResponse.json(errorData, { status: postResponse.status });
    }

    const postData = await postResponse.json();
    const videoUrl = postData.data.xdt_shortcode_media.video_url;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "noVideoUrl", message: "No video URL found in post data" },
        { status: 400 }
      );
    }

    // Step 2: Download video temporarily
    const downloadResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/download-proxy?url=${encodeURIComponent(videoUrl)}&shortcode=${shortcode}`,
      { method: 'GET' }
    );

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.json();
      return NextResponse.json(errorData, { status: downloadResponse.status });
    }

    const downloadData = await downloadResponse.json();

    // Step 3: Send to audio extraction service with user information
    const audioExtractionUrl = process.env.AUDIO_EXTRACTION_SERVICE_URL || 'http://localhost:3001';
    
    const extractionResponse = await fetch(
      `${audioExtractionUrl}/api/extract/from-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: downloadData.downloadUrl,
          shortcode,
          userId,
          format,
          quality,
          videoTitle: postData.data.xdt_shortcode_media.title || `Instagram video ${shortcode}`,
        }),
      }
    );

    if (!extractionResponse.ok) {
      const errorData = await extractionResponse.json();
      return NextResponse.json(
        { 
          error: "extractionFailed", 
          message: "Audio extraction service failed",
          details: errorData 
        },
        { status: 500 }
      );
    }

    const extractionData = await extractionResponse.json();

    // Return the audio extraction job info with user context
    return NextResponse.json({
      success: true,
      data: {
        jobId: extractionData.data.jobId,
        audioFileId: extractionData.data.audioFileId,
        audioUrl: `${audioExtractionUrl}${extractionData.data.audioUrl}`,
        directDownloadUrl: extractionData.data.supabaseUrl,
        statusUrl: `${audioExtractionUrl}/api/extract/status/${extractionData.data.jobId}`,
        downloadUrlEndpoint: `${audioExtractionUrl}/api/extract/download-url/${extractionData.data.jobId}`,
        format: extractionData.data.format,
        size: extractionData.data.size,
        duration: extractionData.data.duration,
        createdAt: extractionData.data.createdAt,
        postInfo: {
          shortcode,
          title: postData.data.xdt_shortcode_media.title || `Instagram video ${shortcode}`,
          owner: postData.data.xdt_shortcode_media.owner.username,
          videoUrl: postData.data.xdt_shortcode_media.video_url,
        },
        userInfo: {
          userId,
        },
      },
    });

  } catch (error: any) {
    console.error("Audio extraction coordination error:", error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: 500 }
    );
  }
} 