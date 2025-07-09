export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Xtract Backend API</h1>
      <p>Audio extraction service API is running.</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li><strong>POST /api/extract</strong> - Extract audio from video URLs</li>
        <li><strong>GET /api/instagram/p/[shortcode]</strong> - Get Instagram video metadata</li>
      </ul>
      <p>Status: <span style={{ color: 'green' }}>✅ Active</span></p>
    </div>
  )
} 