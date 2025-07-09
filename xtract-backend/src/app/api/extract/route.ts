import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AudioProcessor } from "@/lib/audio-processor";
import { extractShortcodeFromUrl, isShortcodePresent } from "@/lib/instagram-utils";
import { HTTP_CODE_ENUM } from "@/features/api/http-codes";
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

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff
async function fetchInstagramWithRetry(shortcode: string, maxRetries = 3): Promise<{ success: boolean; data?: any; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[INFO] Instagram API attempt ${attempt}/${maxRetries} for shortcode: ${shortcode}`);
      
      const response = await getInstagramPostGraphQL({ shortcode });
      const status = response.status;

      if (status === 200) {
        const { data } = (await response.json()) as IG_GraphQLResponseDto;
        
        if (!data.xdt_shortcode_media) {
          return { success: false, error: 'Instagram post not found' };
        }

        if (!data.xdt_shortcode_media.is_video) {
          return { success: false, error: 'Instagram post is not a video' };
        }

        return { success: true, data: data.xdt_shortcode_media };
      }

      if (status === 404) {
        return { success: false, error: 'Instagram post not found' };
      }

      if (status === 429 || status === 401) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`[WARNING] Instagram rate limited (attempt ${attempt}/${maxRetries}). Waiting ${waitTime}ms before retry...`);
        
        if (attempt < maxRetries) {
          await delay(waitTime);
          continue;
        } else {
          return { success: false, error: 'Instagram rate limited - please try again in a few minutes' };
        }
      }

      // Other errors
      console.error(`[ERROR] Instagram API returned status ${status}`);
      return { success: false, error: `Instagram API error: ${status}` };

    } catch (error: any) {
      console.error(`[ERROR] Instagram API attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[INFO] Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      } else {
        return { success: false, error: `Instagram API failed after ${maxRetries} attempts: ${error.message}` };
      }
    }
  }

  return { success: false, error: 'Max retries exceeded' };
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

    // Extract shortcode for Instagram URL
    const shortcode = extractShortcodeFromUrl(url);
    if (!shortcode) {
      throw new Error('Could not extract shortcode from Instagram URL');
    }

    console.log(`[INFO] Extracted shortcode: ${shortcode}`);

    // Fetch Instagram data with retry logic
    const instagramResult = await fetchInstagramWithRetry(shortcode);
    
    if (!instagramResult.success) {
      if (instagramResult.error?.includes('rate limited')) {
        // Return 429 status for rate limiting so mobile app can handle it appropriately
        await supabase
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: instagramResult.error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        return NextResponse.json({
          success: false,
          job_id: jobId,
          error: instagramResult.error,
          message: "Rate limited - please try again in a few minutes",
        } as ExtractResponse, { status: 429 }); // Return 429 status
      }
      
      throw new Error(instagramResult.error || 'Failed to fetch Instagram data');
    }

    const videoUrl = instagramResult.data.video_url;
    console.log(`[INFO] Got Instagram video URL: ${videoUrl.substring(0, 50)}...`);

    // Process audio extraction
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