import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "700"]
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500"]
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "700"]
});

export const metadata: Metadata = {
  title: "IEMAS - Industrial Energy Monitoring & Analytics System",
  description: "Enterprise-grade Industrial IoT platform for monitoring Schneider Energy Meters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-text-2" style={{ backgroundColor: '#FAF9F6' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
