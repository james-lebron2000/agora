"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Code2, 
  Terminal, 
  BookOpen, 
  ArrowRight, 
  Wallet, 
  TrendingUp, 
  Shield,
  FileText,
  MessageCircle
} from "lucide-react";
import Link from "next/link";

export function DeveloperCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const resources = [
    { icon: BookOpen, label: "Documentation", href: "#docs" },
    { icon: Terminal, label: "CLI Tools", href: "#cli" },
    { icon: Code2, label: "SDKs", href: "#sdks" },
    { icon: MessageCircle, label: "Discord", href: "#discord" },
  ];

  return (
    <section id="developers" className="py-24 lg:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-slate-950 to-cyan-950/20" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
              <Code2 className="w-4 h-4" />
              For Developers
            </span>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Build the future of
              <br />
              <span className="text-gradient">autonomous agents</span>
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              Get started building on Agora with our comprehensive SDK, 
              smart contract templates, and extensive documentation. 
              Deploy your first agent in minutes.
            </p>

            {/* Code snippet preview */}
            <div className="mb-8 p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-sm overflow-x-auto">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-slate-500 text-xs ml-2">agent.ts</span>
              </div>
              <pre className="text-slate-300">
                <code>{`import { AgoraAgent } from '@agora/sdk';

const agent = new AgoraAgent({
  name: 'My Trading Agent',
  capabilities: ['swap', 'stake'],
  wallet: process.env.WALLET_KEY,
});

await agent.register();
console.log('Agent deployed!');`}</code>
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="#docs"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all duration-300 glow"
              >
                Start Building
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#github"
                className="inline-flex items-center gap-2 px-6 py-3 glass hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-300"
              >
                View on GitHub
              </Link>
            </div>
          </motion.div>

          {/* Resources grid */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-4"
          >
            {resources.map((resource, index) => (
              <motion.div
                key={resource.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              >
                <Link
                  href={resource.href}
                  className="group flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-violet-500/30 hover:bg-slate-800/50 transition-all duration-300 h-full"
                >
                  <resource.icon className="w-10 h-10 text-violet-400 mb-4 group-hover:scale-110 transition-transform" />
                  <span className="text-white font-medium">{resource.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function InvestorCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const highlights = [
    { icon: TrendingUp, label: "15% Staking APY", desc: "Passive income" },
    { icon: Shield, label: "Audited Contracts", desc: "Security first" },
    { icon: Wallet, label: "$2.4B TVL", desc: "Growing ecosystem" },
    { icon: FileText, label: "Full Transparency", desc: "On-chain verified" },
  ];

  return (
    <section id="investors" className="py-24 lg:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 via-slate-950 to-violet-950/20" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Highlights grid */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 gap-4 order-2 lg:order-1"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800/50 transition-all duration-300"
              >
                <item.icon className="w-8 h-8 text-cyan-400 mb-3" />
                <div className="text-white font-bold">{item.label}</div>
                <div className="text-slate-400 text-sm">{item.desc}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm mb-6">
              <TrendingUp className="w-4 h-4" />
              For Investors
            </span>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Invest in the
              <br />
              <span className="text-gradient">agent economy</span>
            </h2>
            
            <p className="text-lg text-slate-400 mb-8 leading-relaxed">
              Join the future of AI-powered decentralized finance. 
              Stake AGORA tokens to earn rewards, participate in governance, 
              and benefit from the growth of the agent economy.
            </p>

            {/* Investment stats */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-white mb-1">$0.05</div>
                  <div className="text-sm text-slate-400">Token Price</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">15%</div>
                  <div className="text-sm text-slate-400">Staking APY</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">25K+</div>
                  <div className="text-sm text-slate-400">Holders</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-1">$5M</div>
                  <div className="text-sm text-slate-400">Market Cap</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link
                href="#buy"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 glow-cyan"
              >
                Buy AGORA
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#staking"
                className="inline-flex items-center gap-2 px-6 py-3 glass hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-300"
              >
                Start Staking
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
