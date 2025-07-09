# Xtract Backend - Next.js Audio Extraction API

A Next.js API that extracts audio from Instagram videos using their proven GraphQL implementation.

## Architecture

- **Next.js 15** - API routes and serverless functions
- **Instagram GraphQL** - Ported from instagram-video-downloader (working implementation)
- **FFmpeg** - Audio extraction from video
- **Supabase** - Database and file storage
- **Vercel** - Deployment (trusted infrastructure for Instagram API)

## Key Endpoints

### Health Check
```bash
GET /api/extract
```

### Extract Audio
```bash
POST /api/extract
{
  "url": "https://www.instagram.com/p/SHORTCODE/",
  "user_id": "user123"
}
```

### Instagram Video Info
```bash
GET /api/instagram/p/[shortcode]
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Test endpoints:
```bash
# Health check
curl http://localhost:3000/api/extract

# Instagram API
curl http://localhost:3000/api/instagram/p/DD3T42xtmGS
```

## Deployment to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Why Vercel?

The original instagram-video-downloader works because it runs on Vercel's trusted infrastructure. Instagram's detection systems allow requests from legitimate cloud providers like Vercel but block requests from unknown IPs or development environments.

## Mobile App Integration

The mobile app should call the deployed Vercel URL:
```bash
POST https://your-app.vercel.app/api/extract
{
  "url": "https://www.instagram.com/p/SHORTCODE/",
  "user_id": "user123"
}
```

## File Structure

```
src/
├── app/api/
│   ├── extract/route.ts          # Main extraction endpoint
│   └── instagram/p/[shortcode]/  # Instagram GraphQL API
├── lib/
│   ├── instagram-utils.ts        # Instagram GraphQL implementation
│   ├── audio-processor.ts        # FFmpeg audio extraction
│   └── supabase.ts              # Database client
└── types/
    └── instagram.ts             # TypeScript types
```

## Dependencies

- **@supabase/supabase-js** - Database client
- **fluent-ffmpeg** - Audio extraction
- **uuid** - Unique IDs
- **formidable** - File upload handling

## Error Handling

All endpoints include comprehensive error handling with proper HTTP status codes and detailed logging for debugging. 