# Production Dockerfile for Xtract Audio Extraction Service
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create temp directory for processing
RUN mkdir -p /tmp/xtract-processing

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV TEMP_DIR=/tmp/xtract-processing

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
