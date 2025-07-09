import { NextRequest, NextResponse } from "next/server";
import { IG_GraphQLResponseDto } from "@/types/instagram";
import { getInstagramPostGraphQL } from "@/lib/instagram-utils";
import { HTTP_CODE_ENUM } from "@/lib/http-codes";

interface RouteContext {
  params: Promise<{
    shortcode: string;
  }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { shortcode } = await context.params;

  if (!shortcode) {
    return NextResponse.json(
      { error: "noShortcode", message: "shortcode is required" },
      { status: HTTP_CODE_ENUM.BAD_REQUEST }
    );
  }

  try {
    console.log(`[INFO] Processing Instagram shortcode: ${shortcode}`);
    
    const response = await getInstagramPostGraphQL({
      shortcode,
    });

    const status = response.status;
    console.log(`[INFO] Instagram GraphQL response status: ${status}`);

    if (status === 200) {
      const { data } = (await response.json()) as IG_GraphQLResponseDto;
      
      if (!data.xdt_shortcode_media) {
        console.log(`[ERROR] No media found for shortcode: ${shortcode}`);
        return NextResponse.json(
          { error: "notFound", message: "post not found" },
          { status: HTTP_CODE_ENUM.NOT_FOUND }
        );
      }

      if (!data.xdt_shortcode_media.is_video) {
        console.log(`[ERROR] Post is not a video: ${shortcode}`);
        return NextResponse.json(
          { error: "notVideo", message: "post is not a video" },
          { status: HTTP_CODE_ENUM.BAD_REQUEST }
        );
      }

      console.log(`[SUCCESS] Instagram video data retrieved for: ${shortcode}`);
      return NextResponse.json({ data }, { status: HTTP_CODE_ENUM.OK });
    }

    if (status === 404) {
      console.log(`[ERROR] Instagram returned 404 for: ${shortcode}`);
      return NextResponse.json(
        { error: "notFound", message: "post not found" },
        { status: HTTP_CODE_ENUM.NOT_FOUND }
      );
    }

    if (status === 429 || status === 401) {
      console.log(`[ERROR] Instagram rate limited or unauthorized: ${status}`);
      return NextResponse.json(
        {
          error: "tooManyRequests",
          message: "too many requests, try again later",
        },
        { status: HTTP_CODE_ENUM.TOO_MANY_REQUESTS }
      );
    }

    throw new Error(`Instagram API returned status: ${status}`);
  } catch (error: any) {
    console.error(`[ERROR] Instagram API error for ${shortcode}:`, error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: HTTP_CODE_ENUM.INTERNAL_SERVER_ERROR }
    );
  }
} 