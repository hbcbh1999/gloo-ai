import type { Metadata } from "next";
// These styles apply to every route in the application
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
// import { HighlightInit } from "@highlight-run/next/highlight-init";

// import { HighlightClient } from "./_components/highlight";

export const metadata: Metadata = {
  title: "Gloo",
  description: "Power NLP tasks with LLMs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="flex h-screen w-screen items-center justify-center overflow-clip">
          {children}
          {/* <HighlightClient /> */}
        </body>
      </html>
    </ClerkProvider>
  );
}
