import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { SessionBoundary } from "./components/auth/SessionBoundary";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PoWR - Proof of Work Reputation",
  description: "Verifiable, artifact-backed evidence of real work",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  other: {
    "base:app_id": "693ead6ad19763ca26ddc2c5",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} antialiased`}
      >
        <Providers><SessionBoundary>{children}</SessionBoundary></Providers>
      </body>
    </html>
  );
}
