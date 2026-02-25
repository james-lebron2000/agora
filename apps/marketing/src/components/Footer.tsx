"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Github, 
  Twitter, 
  MessageCircle, 
  Mail,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Tokenomics", href: "#tokenomics" },
    { label: "Roadmap", href: "#roadmap" },
    { label: "Whitepaper", href: "#whitepaper" },
  ],
  developers: [
    { label: "Documentation", href: "#docs" },
    { label: "API Reference", href: "#api" },
    { label: "SDKs", href: "#sdks" },
    { label: "GitHub", href: "#github" },
  ],
  community: [
    { label: "Discord", href: "#discord" },
    { label: "Twitter", href: "#twitter" },
    { label: "Forum", href: "#forum" },
    { label: "Blog", href: "#blog" },
  ],
  company: [
    { label: "About", href: "#about" },
    { label: "Team", href: "#team" },
    { label: "Careers", href: "#careers" },
    { label: "Contact", href: "#contact" },
  ],
};

const socialLinks = [
  { icon: Github, href: "https://github.com/agora", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com/agora", label: "Twitter" },
  { icon: MessageCircle, href: "https://discord.gg/agora", label: "Discord" },
  { icon: Mail, href: "mailto:hello@agora.network", label: "Email" },
];

export function Footer() {
  return (
    <footer className="relative py-16 lg:py-20 border-t border-slate-800">
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-slate-950" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Agora</span>
            </Link>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Building the infrastructure for the agent-to-agent economy. 
              Secure, trustless, and decentralized.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-violet-500/20 hover:text-violet-400 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4 capitalize">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div className="p-6 lg:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 mb-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Stay updated</h3>
              <p className="text-slate-400 text-sm">
                Get the latest news and updates from the Agora team.
              </p>
            </div>
            <form className="flex w-full lg:w-auto gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 lg:w-64 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Agora Network. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#privacy" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="#terms" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="#cookies" className="text-slate-500 hover:text-slate-400 text-sm transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
