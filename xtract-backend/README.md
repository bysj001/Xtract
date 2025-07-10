# Xtract Backend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Instagram video processing backend service that fetches videos and uploads them to Supabase Storage for audio extraction processing.

## 🏗️ Architecture

This service acts as the **Vercel Backend** in a distributed system:

1. **Vercel Backend (This Service)**: 
   - Fetches Instagram video URLs via GraphQL
   - Downloads videos and uploads to Supabase Storage
   - Notifies Railway backend for audio extraction

2. **Railway Backend**: 
   - Downloads videos from Supabase Storage
   - Extracts audio using FFmpeg
   - Uploads final MP3 to Supabase audio bucket
   - Cleans up temporary video files

## ✨ Features

- **Instagram Integration**: Fetches video data using Instagram's GraphQL API
- **Supabase Storage**: Temporary video file storage and transfer
- **Railway Integration**: Webhook notifications for audio extraction
- **Automatic Cleanup**: 24-hour temporary file lifecycle
- **Error Handling**: Comprehensive error responses and logging
- **Vercel Optimized**: Configured for serverless deployment

## 📚 API Endpoints

### `POST /api/process-instagram`
Complete Instagram video processing pipeline.

**Request:**
```json
{
  "url": "https://www.instagram.com/p/ABC123/"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortcode": "ABC123",
    "filename": "ABC123_1234567890.mp4",
    "videoUrl": "https://supabase-storage-url/...",
    "extractionStatus": "started",
    "metadata": {
      "title": "Video caption...",
      "username": "user123",
      "duration": 30,
      "thumbnail": "https://..."
    }
  },
  "message": "Video processed and audio extraction initiated"
}
```

### `POST /api/upload-video`
Direct video upload to Supabase Storage.

**Request:**
```json
{
  "videoUrl": "https://video-url.com/video.mp4",
  "shortcode": "ABC123"
}
```

### `GET /api/instagram/p/[shortcode]`
Fetch Instagram post metadata only.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (v15+)
- **Storage**: [Supabase Storage](https://supabase.com/storage)
- **Deployment**: [Vercel](https://vercel.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Validation**: [Zod](https://zod.dev/)

## 🚀 Getting Started

### Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Storage Buckets**: Create buckets named `video-temp` and `audio-final`
3. **Railway Backend**: Optional, for audio extraction

### Environment Variables

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Railway Backend Configuration (Optional)
RAILWAY_BACKEND_URL=your_railway_backend_url
RAILWAY_WEBHOOK_SECRET=your_webhook_secret

# Storage Configuration
SUPABASE_STORAGE_BUCKET=video-temp
```

### Local Development

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd xtract-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

### Deployment to Vercel

1. **Connect to Vercel:**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```

2. **Set environment variables in Vercel dashboard**

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## 📝 Usage Examples

### JavaScript/TypeScript
```javascript
const response = await fetch('https://your-vercel-app.vercel.app/api/process-instagram', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://www.instagram.com/p/ABC123/'
  })
});

const result = await response.json();
console.log(result.data.videoUrl); // Supabase Storage URL
```

### cURL
   ```bash
curl -X POST https://your-vercel-app.vercel.app/api/process-instagram \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/p/ABC123/"}'
   ```

## 🔧 Configuration

### Supabase Storage Buckets

Create the following buckets in your Supabase project:

1. **video-temp** (Public)
   - For temporary video storage
   - 24-hour automatic cleanup
   
2. **audio-final** (Public/Private as needed)
   - For final extracted audio files
   - Managed by Railway backend

### Vercel Function Configuration

The `vercel.json` file configures:
- 30-second timeout for video processing
- IAD1 region for optimal performance
- Custom build command

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.

## ⚠️ Disclaimer

This tool is for educational purposes only. Downloading videos from Instagram may violate their Terms of Service. Please respect copyright laws and the platform's policies. Use responsibly and only for content you have the right to download.
