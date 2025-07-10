import { NextRequest, NextResponse } from "next/server";
import { getInstagramPostGraphQL } from "../instagram/p/[shortcode]/utils";

export async function POST(request: NextRequest) {
  try {
    const { instagramUrl } = await request.json();

    // Validate required fields
    if (!instagramUrl) {
      return NextResponse.json(
        { error: "missingParameters", message: "Instagram URL is required" },
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

    // Simple Instagram API call (just like working solution)
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

    // Return just the data - NO video downloading here!
    return NextResponse.json({
      success: true,
      data: {
        shortcode,
        videoUrl,
        metadata: {
          title: data.xdt_shortcode_media.edge_media_to_caption?.edges[0]?.node?.text || '',
          username: data.xdt_shortcode_media.owner?.username || '',
          duration: data.xdt_shortcode_media.video_duration || 0,
          thumbnail: data.xdt_shortcode_media.display_url || ''
        }
      }
    });

  } catch (error: any) {
    console.error("Get Instagram video error:", error);
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