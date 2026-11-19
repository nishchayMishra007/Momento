import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Clipping — AI Video Clips",
  description: "Turn long videos into short, catchy clips with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.className} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-zinc-900">
        <header className="border-b border-zinc-100/80">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-950 transition-opacity hover:opacity-70"
            >
              Clipping
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
