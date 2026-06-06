import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PreventPath - Prevention Navigator",
  description: "See what prevention information may be missing. Navigate possible NHS prevention routes. Prepare for conversations with your GP or pharmacist. Not a diagnostic tool.",
  keywords: ["prevention", "NHS", "health check", "GP", "pharmacist", "healthcare"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sourceSans3.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}