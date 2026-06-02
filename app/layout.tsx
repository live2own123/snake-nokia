import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // allow content to extend under notches; CSS uses safe-area insets
  themeColor: "#0a0b0d",
};

export const metadata: Metadata = {
  title: "snake",
  description: "Classic Snake, Base style — an onchain game on Base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
