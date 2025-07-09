import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface RouteContext {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { filename } = await context.params;

  if (!filename) {
    return NextResponse.json(
      { error: "missingFilename", message: "filename is required" },
      { status: 400 }
    );
  }

  try {
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "");
    if (sanitizedFilename !== filename) {
      return NextResponse.json(
        { error: "invalidFilename", message: "invalid filename" },
        { status: 400 }
      );
    }

    const tempDir = join(process.cwd(), "temp");
    const filepath = join(tempDir, sanitizedFilename);

    // Check if file exists
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: "fileNotFound", message: "file not found or expired" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(filepath);

    // Set appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", "video/mp4");
    headers.set("Content-Length", fileBuffer.length.toString());
    headers.set("Cache-Control", "private, max-age=3600"); // Cache for 1 hour

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: headers,
    });
  } catch (error: any) {
    console.error("Temp file serve error:", error);
    return NextResponse.json(
      { error: "serverError", message: error.message },
      { status: 500 }
    );
  }
} 