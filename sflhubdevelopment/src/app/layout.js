import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import AppShell from "./components/appShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SFL Dispatch Hub",
  description: "SFL Dispatch Hub",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh max-w-full flex-col">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
