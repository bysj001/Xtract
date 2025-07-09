import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xtract Backend API",
  description: "Backend API for video content extraction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
