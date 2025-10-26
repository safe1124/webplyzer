import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webplyzer",
  description: "Batch convert JPEG and PNG files to WebP with rename support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="font-sans">{children}</body>
    </html>
  );
}
