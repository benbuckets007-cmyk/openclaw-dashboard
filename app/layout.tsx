import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { OpenClawProvider } from "@/contexts/OpenClawContext";
import { Sidebar } from "@/components/Sidebar";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Marketing Operations System",
  description: "Operational dashboard for AI content planning, review, and posting workflows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <OpenClawProvider>
          <div className="flex min-h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="min-h-screen">{children}</div>
            </main>
          </div>
        </OpenClawProvider>
      </body>
    </html>
  );
}
