# Xtract Backend

Backend API service for the Xtract platform - handles Instagram video URL parsing and temporary video storage. Designed to work with the separate audio extraction service.

## Features

- Instagram URL validation and shortcode extraction
- Instagram GraphQL API integration for video metadata
- Temporary video file storage
- API endpoints for video download proxy
- Coordinated audio extraction workflow
- Optimized for Vercel deployment

## API Endpoints

### Instagram Video Processing
- `GET /api/instagram/p/[shortcode]` - Get Instagram post metadata
- `GET /api/download-proxy` - Download and temporarily store video
- `GET /api/temp-file/[filename]` - Serve temporarily stored files

### Audio Extraction Coordination
- `POST /api/extract-audio` - Complete workflow: Instagram URL → Audio file

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables (see Environment Variables section)

4. Run development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# Base URL for this service (used for internal API calls)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Audio extraction service URL (Railway deployment)
AUDIO_EXTRACTION_SERVICE_URL=https://your-railway-app.railway.app
```

For production (Vercel), set these in your Vercel project settings:
```env
NEXT_PUBLIC_BASE_URL=https://your-vercel-app.vercel.app
AUDIO_EXTRACTION_SERVICE_URL=https://your-railway-app.railway.app
```

## Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy - Vercel will automatically detect this as a Next.js project

### Vercel Configuration

The project includes:
- `next.config.ts` - Next.js configuration
- `package.json` - Dependencies and scripts optimized for API-only usage
- API routes under `src/app/api/`

## Architecture

This backend works as part of a two-service architecture:

```
User Request → Xtract Backend (Vercel) → Audio Extraction Service (Railway)
                     ↓
            Temporary video storage
                     ↓
               Video URL provided to
              Audio Extraction Service
```

### Service Communication Flow

1. **Instagram URL Processing**: User provides Instagram URL
2. **Metadata Retrieval**: Backend fetches video metadata from Instagram
3. **Temporary Storage**: Video is downloaded and stored temporarily
4. **Audio Extraction**: Video URL is sent to audio extraction service
5. **Audio Processing**: Audio extraction service processes and returns audio file
6. **Cleanup**: Temporary files are cleaned up automatically

## Usage Examples

### Complete Audio Extraction Workflow
```bash
curl -X POST https://your-vercel-app.vercel.app/api/extract-audio \
  -H "Content-Type: application/json" \
  -d '{
    "instagramUrl": "https://www.instagram.com/p/ABC123DEF456/",
    "format": "mp3",
    "quality": "medium"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "audioUrl": "https://audio-service.railway.app/api/extract/download/550e8400-e29b-41d4-a716-446655440000",
    "statusUrl": "https://audio-service.railway.app/api/extract/status/550e8400-e29b-41d4-a716-446655440000",
    "format": "mp3",
    "size": 1234567,
    "duration": 180.5,
    "postInfo": {
      "shortcode": "ABC123DEF456",
      "title": "Video Title",
      "owner": "username"
    }
  }
}
```

### Individual Endpoints

#### Get Instagram Post Metadata
```bash
curl https://your-vercel-app.vercel.app/api/instagram/p/ABC123DEF456
```

#### Download Video Temporarily
```bash
curl "https://your-vercel-app.vercel.app/api/download-proxy?url=VIDEO_URL&shortcode=ABC123DEF456"
```

## File Management

- Temporary video files are stored in `/temp` directory
- Files are automatically cleaned up after processing
- Temporary file serving includes security measures:
  - Filename sanitization
  - Path traversal prevention
  - Limited file retention

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Invalid URLs, missing parameters
- **404 Not Found**: Post not found, expired files
- **429 Too Many Requests**: Instagram rate limiting
- **500 Internal Server Error**: Processing failures

Example error response:
```json
{
  "error": "invalidUrl",
  "message": "Invalid Instagram URL"
}
```

## Dependencies

### Core
- **Next.js 15** - Web framework and API routes
- **React 19** - Required by Next.js
- **Zod** - Schema validation
- **TypeScript** - Type safety

### Removed Dependencies
The following UI-related dependencies were removed for backend-only operation:
- Tailwind CSS and related packages
- React Query and devtools
- UI component libraries (Radix UI)
- Internationalization packages
- Theme and styling packages

## API Rate Limiting

Instagram API calls may be rate-limited. The service handles:
- 429 responses from Instagram
- Automatic error propagation
- Proper error messages for rate limiting

## Security Considerations

- Filename sanitization for temporary files
- Path traversal prevention
- CORS handling for cross-origin requests
- Input validation for all endpoints
- Temporary file cleanup

## Development

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── download-proxy/     # Video download and storage
│   │   ├── extract-audio/      # Audio extraction coordination
│   │   ├── instagram/          # Instagram API integration
│   │   └── temp-file/          # Temporary file serving
│   └── layout.tsx              # Minimal layout
├── features/
│   └── api/                    # API utilities and transformations
├── lib/                        # Utility functions
└── types/                      # TypeScript definitions
```

### Adding New Features

1. Create new API routes in `src/app/api/`
2. Add utility functions to `src/lib/`
3. Update TypeScript types in `src/types/`
4. Test with both local and deployed audio extraction service

## Technologies Used

- **Next.js** - Full-stack React framework
- **TypeScript** - Type safety and better DX
- **Vercel** - Deployment platform
- **Node.js** - Runtime environment
