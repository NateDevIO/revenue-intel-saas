import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { KeyboardShortcutsProvider } from "@/components/layout/keyboard-shortcuts-provider";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { reportWebVitals } from "@/lib/performance";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Revenue Intel - SaaS Analytics",
    template: "%s | Revenue Intel",
  },
  description:
    "AI-powered revenue intelligence platform that predicts churn, identifies at-risk customers, and maximizes revenue growth for SaaS businesses",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.svg",
  },
};

// Export reportWebVitals for Next.js to call
export { reportWebVitals };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <KeyboardShortcutsProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-muted/30" role="main" aria-label="Main content">
                <div className="container mx-auto p-6">{children}</div>
              </main>
            </div>
            <Toaster />
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
