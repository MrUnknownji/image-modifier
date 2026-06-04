import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "AuraEdit - Professional Image Editing & Optimization",
  description: "A powerful, privacy-focused image processing tool. Resize, convert, and optimize your images with a professional aura.",
  keywords: ["image editor", "auraedit", "image resizer", "image converter", "image optimizer", "batch processing"],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
