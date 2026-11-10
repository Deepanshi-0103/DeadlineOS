import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DeadlineOS — Plan · Capture · Never Miss",
  description:
    "Aesthetic planning for deadlines, goals, contests, and opportunities. Capture with AI. Plan your day. Stay on track.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/brand/logo.png", type: "image/png" }],
    apple: [{ url: "/brand/logo.png" }],
    shortcut: ["/favicon.png"],
  },
};

const noFlashScript = `
(function () {
  try {
    var stored = window.localStorage.getItem("dbd-theme");
    var theme = stored === "dark" ? "dark" : "light";
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="bg-base font-body text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
