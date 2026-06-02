import type { Metadata, Viewport } from "next";
import "@coinbase/onchainkit/styles.css";
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
  description: "Classic Snake, Base style — a mini app on Base.",
  // Carry over the existing Base App id from the old index.html.
  other: {
    "base:app_id": "69a93ce2223099cde830596c",
  },
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
