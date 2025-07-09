// app/api/download-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileUrl = searchParams.get("url");
  const shortcode = searchParams.get("shortcode") || "unknown";

  if (!fileUrl) {
    return NextResponse.json(
      { error: "missingUrl", message: "url is required" },
      { status: 400 }
    );
  }

  try {
    // Validate the URL
    if (!fileUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the video from the external URL
    const videoResponse = await fetch(fileUrl);

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    // Get the video data as buffer
    const videoBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(videoBuffer);

    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), "temp");
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${shortcode}_${timestamp}.mp4`;
    const filepath = join(tempDir, filename);

    // Save the video temporarily
    await writeFile(filepath, buffer);

    // Return the temporary file info
    return NextResponse.json({
      success: true,
      tempFile: filename,
      filepath: filepath,
      size: buffer.length,
      downloadUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/temp-file/${filename}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    });
  } catch (error: any) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: 500 }
    );
  }
}
