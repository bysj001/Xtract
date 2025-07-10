import { NextRequest, NextResponse } from "next/server";

import { IG_GraphQLResponseDto } from "@/features/api/_dto/instagram";

import { getInstagramPostGraphQL } from "./utils";

interface RouteContext {
  params: Promise<{
    shortcode: string;
  }>;
}

// Simple in-memory cache to avoid duplicate requests
const postCache = new Map<string, { data: IG_GraphQLResponseDto; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

function getCachedPost(shortcode: string): IG_GraphQLResponseDto | null {
  const cached = postCache.get(shortcode);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Serving cached Instagram post: ${shortcode}`);
    return cached.data;
  }
  if (cached) {
    postCache.delete(shortcode); // Remove expired cache
  }
  return null;
}

function setCachedPost(shortcode: string, data: IG_GraphQLResponseDto) {
  postCache.set(shortcode, { data, timestamp: Date.now() });
  console.log(`Cached Instagram post: ${shortcode}`);
}

// Retry with exponential backoff for rate limiting
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Only retry on rate limiting or network errors
      if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('429')) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Instagram rate limited, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { shortcode } = await context.params;

  if (!shortcode) {
    return NextResponse.json(
      { error: "noShortcode", message: "shortcode is required" },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cachedData = getCachedPost(shortcode);
    if (cachedData) {
      const data = cachedData.data;
      if (!data.xdt_shortcode_media) {
        return NextResponse.json(
          { error: "notFound", message: "post not found" },
          { status: 404 }
        );
      }

      if (!data.xdt_shortcode_media.is_video) {
        return NextResponse.json(
          { error: "notVideo", message: "post is not a video" },
          { status: 400 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const response = await retryWithBackoff(async () => {
      const response = await getInstagramPostGraphQL({
        shortcode,
      });
      
      // Throw error for non-2xx responses to trigger retry logic
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }
      
      return response;
    }, 3, 2000); // 3 retries, starting with 2 second delay

    const status = response.status;

    if (status === 200) {
      const responseData = (await response.json()) as IG_GraphQLResponseDto;
      
      // Cache the successful response
      setCachedPost(shortcode, responseData);
      
      const data = responseData.data;
      if (!data.xdt_shortcode_media) {
        return NextResponse.json(
          { error: "notFound", message: "post not found" },
          { status: 404 }
        );
      }

      if (!data.xdt_shortcode_media.is_video) {
        return NextResponse.json(
          { error: "notVideo", message: "post is not a video" },
          { status: 400 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    if (status === 404) {
      return NextResponse.json(
        { error: "notFound", message: "post not found" },
        { status: 404 }
      );
    }

    if (status === 429 || status === 401) {
      return NextResponse.json(
        {
          error: "tooManyRequests",
          message: "Instagram is rate limiting requests. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    throw new Error("Failed to fetch post data");
  } catch (error: any) {
    console.error("Instagram API error:", error);
    
    // Handle rate limiting specifically
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('rate')) {
      return NextResponse.json(
        {
          error: "tooManyRequests",
          message: "Instagram is temporarily rate limiting requests. Please wait a few minutes and try again.",
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: "serverError", message: "Failed to fetch Instagram post" },
      { status: 500 }
    );
  }
}
