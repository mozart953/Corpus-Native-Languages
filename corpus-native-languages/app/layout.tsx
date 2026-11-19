import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Inter, Source_Sans_3 } from "next/font/google";
import Providers from "@/components/Auth/Providers.jsx";
import { I18nProvider } from "@/lib/i18n";
import { fetchPageContent } from "@/lib/content";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocaleCode } from "@/lib/locale";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The locale cookie is written by the client toggle, so the next server
  // render already carries the chosen language. Page copy is fetched here
  // rather than in a client effect to avoid a flash of message keys.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocaleCode(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const content = await fetchPageContent(locale);

  return (
    <html
      lang={content.locale}
      suppressHydrationWarning
      className={`dark ${dmSans.variable} ${sourceSans.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <I18nProvider
            initialLocale={content.locale}
            initialMessages={content.messages}
            initialLocales={content.locales}
          >
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
