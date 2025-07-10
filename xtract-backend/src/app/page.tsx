'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [userId, setUserId] = useState('') 
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          instagramUrl: url,
          userId: userId,
          format: 'mp3',
          quality: 'medium'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Xtract Backend
          </h1>
          <p className="text-gray-600 mb-8">
            Instagram Video Processing & Audio Extraction Service
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Instagram Video URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                User ID (Optional - for testing)
              </label>
              <input
                type="text"
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Leave empty to use test-user-id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Extract Audio'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-medium text-green-800 mb-3">
                Success! 
              </h3>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Job ID:</strong> {result.data.jobId}</p>
                <p><strong>Extraction Started:</strong> {result.data.extractionStarted ? 'Yes' : 'No'}</p>
                {result.data.metadata.username && (
                  <p><strong>Username:</strong> @{result.data.metadata.username}</p>
                )}
                {result.data.metadata.duration > 0 && (
                  <p><strong>Duration:</strong> {result.data.metadata.duration}s</p>
                )}
                {result.data.metadata.title && (
                  <p><strong>Title:</strong> {result.data.metadata.title.substring(0, 100)}...</p>
                )}
              </div>
              <p className="mt-3 text-xs text-green-600">
                {result.message}
              </p>
            </div>
          )}

          <div className="mt-8 text-xs text-gray-500">
            <p><strong>API Endpoints:</strong></p>
            <ul className="mt-2 space-y-1">
              <li>• <code>POST /api/extract-audio</code> - Mobile app audio extraction</li>
              <li>• <code>POST /api/process-instagram</code> - Simple Instagram processing</li>
              <li>• <code>POST /api/upload-video</code> - Direct video upload to Supabase</li>
              <li>• <code>GET /api/instagram/p/[shortcode]</code> - Instagram post data</li>
            </ul>
            
            <div className="mt-4">
              <p><strong>Architecture:</strong></p>
              <p className="mt-1">Mobile App → Vercel Backend → Supabase Storage → Railway Audio Extraction</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 