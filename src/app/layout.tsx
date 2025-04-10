import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./fonts.css"; // Import custom fonts

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handwriting App",
  description: "Create realistic handwritten notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load Google Fonts with proper display setting */}
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat&family=Homemade+Apple&family=Indie+Flower&family=Reenie+Beanie&family=Rock+Salt&family=Dancing+Script&family=Kalam&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
