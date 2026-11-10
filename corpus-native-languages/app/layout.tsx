import type { Metadata } from "next";
import { DM_Sans, Inter, Source_Sans_3 } from "next/font/google";
import Providers from "@/components/Auth/Providers.jsx";
import "./globals.css";

/**
 * Three families, one job each:
 *   DM Sans       -> titles and display text (headings, figures, native words)
 *   Source Sans 3 -> body copy and everything that reads as a sentence
 *   Inter         -> small letter-spaced text and shadcn controls
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

/**
 * Apply the saved theme before first paint so a light-theme visitor never
 * sees a dark flash. Keep the key in sync with components/ThemeToggle.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("nl-theme");
    var theme = stored === "light" ? "light" : "dark";
    var root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  } catch (error) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`dark ${dmSans.variable} ${sourceSans.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
