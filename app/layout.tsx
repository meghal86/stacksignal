import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StackSignal — Decision Compression for Founders",
    template: "%s | StackSignal",
  },
  description: "We analyze ecosystem signals to tell you what NOT to build. Save 6 months of wasted effort.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "StackSignal — Decision Compression for Founders",
    description: "We analyze ecosystem signals to tell you what NOT to build. Save 6 months of wasted effort.",
    siteName: "StackSignal",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StackSignal — Decision Compression for Founders",
    description: "We analyze ecosystem signals to tell you what NOT to build.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
