import type { Metadata } from "next";
import localFont from "next/font/local";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import { ThemeProvider, ThemeToggle, PageTransitionWrapper, SafariThemeUpdater } from "../components";
import { Analytics } from "@vercel/analytics/next"

const untitledSans = localFont({
  src: [
    {
      path: "../../public/fonts/UntitledSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/UntitledSans-Medium.ttf",
      weight: "500", 
      style: "normal",
    },
    {
      path: "../../public/fonts/UntitledSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-untitled-sans",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  display: "swap",
  preload: true, // Preload the primary font family
});

const family = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-family",
  fallback: ["Georgia", "Times New Roman", "serif"],
  display: "swap",
  preload: false, // Don't preload serif font - used less frequently
});

export const metadata: Metadata = {
  title: "The Website of Fred Zaw",
  description: "Designer at Clay working on AI and agentic capabilities. Previously at Uniswap Labs unlocking a more free and open financial system, with earlier work spanning AI and spatial computing.",
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },

    ],
  },
  other: {
    // Safari browser chrome theming - light mode default
    "theme-color": "#ffffff",
    // iOS Safari status bar style
    "apple-mobile-web-app-status-bar-style": "default",
    // PWA support
    "apple-mobile-web-app-capable": "yes",
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
        className={`${untitledSans.variable} ${family.variable} antialiased`}
      >
        <ThemeProvider>
          <PageTransitionWrapper>
            {children}
          </PageTransitionWrapper>
          <ThemeToggle />
          <SafariThemeUpdater />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
