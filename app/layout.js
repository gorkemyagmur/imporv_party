import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HowletChatbot from "@/components/HowletChatbot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Improv Party Host",
  description: "AI-inspired moderator for in-person party improv games.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-gradient-to-b from-[#1e0b40] via-[#2b0f55] to-[#050211] text-white antialiased`}
      >
        {children}
        <HowletChatbot />
      </body>
    </html>
  );
}
