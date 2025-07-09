import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AudioProcessor } from "@/lib/audio-processor";
import { extractShortcodeFromUrl, isShortcodePresent } from "@/lib/instagram-utils";
import { HTTP_CODE_ENUM } from "@/features/api/http-codes";
import { v4 as uuidv4 } from 'uuid';
import { getInstagramPostGraphQL } from "@/app/api/instagram/p/[shortcode]/utils";
import { IG_GraphQLResponseDto } from "@/features/api/_dto/instagram";

// Request/Response types for mobile app
interface ExtractRequest {
  url: string;
  user_id: string;
}

interface ExtractResponse {
  success: boolean;
  job_id: string;
  audio_file_id?: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  
  try {
    const body: ExtractRequest = await request.json();
    const { url, user_id } = body;

    // Validate input
    if (!url || !url.trim()) {
      return NextResponse.json(
        { success: false, job_id: "", message: "URL is required", error: "URL is required" } as ExtractResponse,
        { status: HTTP_CODE_ENUM.BAD_REQUEST }
      );
    }

    if (!user_id || !user_id.trim()) {
      return NextResponse.json(
        { success: false, job_id: "", message: "User ID is required", error: "User ID is required" } as ExtractResponse,
        { status: HTTP_CODE_ENUM.BAD_REQUEST }
      );
    }

    // Only support Instagram for now
    if (!isShortcodePresent(url)) {
      return NextResponse.json(
        { success: false, job_id: "", message: "Only Instagram URLs are currently supported", error: "Unsupported platform" } as ExtractResponse,
        { status: HTTP_CODE_ENUM.BAD_REQUEST }
      );
    }

    console.log(`[INFO] Processing extract request for user: ${user_id}, URL: ${url}`);

    // Create processing job
    const { data: jobData, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        user_id,
        original_url: url,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !jobData) {
      console.error('[ERROR] Failed to create processing job:', jobError);
      throw new Error('Failed to create processing job');
    }

    jobId = jobData.id;
    console.log(`[INFO] Created processing job: ${jobId}`);

    // Update job status to processing
    await supabase
      .from('processing_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Extract shortcode and get video info using exact implementation
    const shortcode = extractShortcodeFromUrl(url);
    if (!shortcode) {
      throw new Error('Could not extract shortcode from Instagram URL');
    }

    console.log(`[INFO] Extracted shortcode: ${shortcode}`);

    // Use the exact same Instagram GraphQL implementation as the working project
    const response = await getInstagramPostGraphQL({
      shortcode,
    });

    const status = response.status;
    console.log(`[INFO] Instagram GraphQL response status: ${status}`);

    if (status === 200) {
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      console.log(`[INFO] Instagram response content-type: ${contentType}`);
      
      let responseData;
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = (await response.json()) as IG_GraphQLResponseDto;
        } else {
          // If not JSON, read as text to see what we got
          const responseText = await response.text();
          console.log(`[ERROR] Instagram returned non-JSON response: ${responseText.substring(0, 200)}...`);
          throw new Error('Instagram returned non-JSON response - possibly rate limited or blocked');
        }
      } catch (parseError: any) {
        console.error(`[ERROR] Failed to parse Instagram response:`, parseError);
        const responseText = await response.text();
        console.log(`[ERROR] Raw response: ${responseText.substring(0, 200)}...`);
        throw new Error(`Failed to parse Instagram response: ${parseError.message}`);
      }

      const { data } = responseData;
      
      if (!data.xdt_shortcode_media) {
        throw new Error('Instagram post not found');
      }

      if (!data.xdt_shortcode_media.is_video) {
        throw new Error('Instagram post is not a video');
      }

      const videoUrl = data.xdt_shortcode_media.video_url;
      console.log(`[INFO] Got Instagram video URL: ${videoUrl.substring(0, 50)}...`);

      // Process audio extraction using proxy approach (same as working project)
      const baseUrl = request.nextUrl.origin;
      const audioProcessor = new AudioProcessor(baseUrl);
      const audioFileId = await audioProcessor.processInstagramVideo(videoUrl, user_id);

      // Update job as completed
      await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          result_audio_file_id: audioFileId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      console.log(`[SUCCESS] Audio extraction completed. Job: ${jobId}, Audio file: ${audioFileId}`);

      return NextResponse.json({
        success: true,
        job_id: jobId,
        audio_file_id: audioFileId,
        message: "Audio extraction completed successfully",
      } as ExtractResponse, { status: HTTP_CODE_ENUM.OK });

    } else if (status === 404) {
      throw new Error('Instagram post not found');
    } else if (status === 429 || status === 401) {
      throw new Error('Instagram rate limited - too many requests, try again later');
    } else {
      // For other error statuses, try to get the response text for debugging
      try {
        const errorText = await response.text();
        console.log(`[ERROR] Instagram error response (${status}): ${errorText.substring(0, 200)}...`);
        throw new Error(`Instagram API returned status ${status}: ${errorText.substring(0, 100)}`);
      } catch {
        throw new Error(`Instagram API returned status: ${status}`);
      }
    }

  } catch (error: any) {
    const errorMessage = `Audio extraction failed: ${error.message}`;
    console.error(`[ERROR] ${errorMessage}`, error);

    // Update job as failed if job was created
    if (jobId) {
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    return NextResponse.json({
      success: false,
      job_id: jobId || "",
      error: errorMessage,
      message: "Audio extraction failed",
    } as ExtractResponse, { status: HTTP_CODE_ENUM.INTERNAL_SERVER_ERROR });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Xtract Audio API is running",
    timestamp: new Date().toISOString(),
  });
} 