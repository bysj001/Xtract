/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['fluent-ffmpeg'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.railway.app']
    }
  }
}

module.exports = nextConfig 