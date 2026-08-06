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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "PoWR — Hire developers through proof of work",
    template: "%s | PoWR",
  },
  description: "PoWR helps companies attract, evaluate, and hire developers using verified work evidence, transparent reputation, and one organized recruiting workflow.",
  openGraph: {
    title: "PoWR — Hire developers through proof of work",
    description: "Real work. Clear contribution. Explainable role fit.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
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
