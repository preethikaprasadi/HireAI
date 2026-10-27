import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HireAI",
  description:
    "AI-powered recruitment and talent management platform.",
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
