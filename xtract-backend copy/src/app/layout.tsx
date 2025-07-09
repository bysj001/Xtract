import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Xtract Backend API',
  description: 'Backend API for Xtract audio extraction service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 