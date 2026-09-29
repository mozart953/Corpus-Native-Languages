import type { Metadata } from "next";
import { DM_Sans, Inter, Source_Sans_3 } from "next/font/google";
import "./globals.css";

/**
 * Three families, one job each:
 *   DM Sans       -> titles and display text (headings, figures, native words)
 *   Source Sans 3 -> body copy and everything that reads as a sentence
 *   Inter         -> small letter-spaced text (labels, chips, badges, counts)
 *
 * Exposed as CSS variables so globals.css can assign them by role instead of
 * every component hard-coding a family name.
 */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mayan-Corpus",
  description: "This project is developing to help to presserve native languages in Guatemala and close the gap between native communities and technology. ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${dmSans.variable} ${sourceSans.variable} ${inter.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
