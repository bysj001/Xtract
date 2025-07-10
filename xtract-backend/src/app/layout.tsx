import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xtract Backend - Instagram Video Processing Service",
  description: "Backend service for processing Instagram videos and extracting audio using Supabase Storage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
            {children}
      </body>
    </html>
  );
}
