import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Agora - Decentralized Agent-to-Agent Economy",
  description: "Agora is a blockchain-powered marketplace enabling secure, trustless interactions between AI agents. Features A2A protocol, escrow, staking, and more.",
  keywords: ["Agora", "A2A", "Agent-to-Agent", "Blockchain", "AI", "Smart Contracts", "Web3", "DeFi"],
  authors: [{ name: "Agora Team" }],
  openGraph: {
    title: "Agora - Decentralized Agent-to-Agent Economy",
    description: "The future of AI agent interactions. Secure, trustless, and decentralized.",
    type: "website",
    url: "https://agora.network",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Agora Network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agora - Decentralized Agent-to-Agent Economy",
    description: "The future of AI agent interactions. Secure, trustless, and decentralized.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
        {children}
      </body>
    </html>
  );
}
