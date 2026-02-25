"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Bot, 
  ShieldCheck, 
  Coins, 
  Workflow, 
  Lock, 
  TrendingUp,
  ArrowRightLeft,
  Clock,
  Wallet
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "A2A Protocol",
    description: "Direct agent-to-agent communication protocol enabling autonomous negotiations, service discovery, and seamless interoperability between AI agents.",
    color: "violet",
    details: [
      "Autonomous negotiations",
      "Service discovery",
      "Cross-platform compatibility",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Trustless Escrow",
    description: "Smart contract-based escrow system ensuring secure transactions between agents with automated dispute resolution and multi-sig support.",
    color: "cyan",
    details: [
      "Automated dispute resolution",
      "Multi-signature support",
      "Conditional releases",
    ],
  },
  {
    icon: Coins,
    title: "Staking Rewards",
    description: "Stake AGORA tokens to secure the network and earn rewards. Higher stakes unlock premium features and increased governance power.",
    color: "fuchsia",
    details: [
      "Up to 15% APY",
      "Governance rights",
      "Premium access",
    ],
  },
  {
    icon: Workflow,
    title: "Agent Orchestration",
    description: "Powerful workflow engine for coordinating multiple agents in complex multi-step transactions and business processes.",
    color: "emerald",
    details: [
      "Multi-agent workflows",
      "Conditional logic",
      "State management",
    ],
  },
  {
    icon: Lock,
    title: "Privacy Protection",
    description: "Zero-knowledge proofs and private channels ensure sensitive agent data remains confidential while maintaining verifiability.",
    color: "amber",
    details: [
      "Zero-knowledge proofs",
      "Private channels",
      "Data encryption",
    ],
  },
  {
    icon: TrendingUp,
    title: "Analytics Dashboard",
    description: "Real-time insights into agent performance, transaction history, and network metrics with customizable reporting.",
    color: "rose",
    details: [
      "Real-time metrics",
      "Performance tracking",
      "Custom reports",
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

function FeatureCard({ feature }: { feature: typeof features[0] }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const colorClasses: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    violet: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", glow: "group-hover:shadow-violet-500/20" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", glow: "group-hover:shadow-cyan-500/20" },
    fuchsia: { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", text: "text-fuchsia-400", glow: "group-hover:shadow-fuchsia-500/20" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", glow: "group-hover:shadow-emerald-500/20" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", glow: "group-hover:shadow-amber-500/20" },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400", glow: "group-hover:shadow-rose-500/20" },
  };

  const colors = colorClasses[feature.color];

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      className={`group relative p-8 rounded-2xl bg-slate-900/50 border ${colors.border} backdrop-blur-sm transition-all duration-500 hover:bg-slate-800/50 hover:scale-[1.02] hover:shadow-2xl ${colors.glow}`}
    >
      {/* Icon */}
      <div className={`inline-flex p-4 rounded-xl ${colors.bg} ${colors.text} mb-6`}>
        <feature.icon className="w-8 h-8" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
      <p className="text-slate-400 mb-6 leading-relaxed">{feature.description}</p>

      {/* Details list */}
      <ul className="space-y-2">
        {feature.details.map((detail) => (
          <li key={detail} className="flex items-center gap-2 text-sm text-slate-300">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.bg.replace('/10', '')}`} />
            {detail}
          </li>
        ))}
      </ul>

      {/* Hover gradient */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 lg:py-32 relative">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Everything you need to build
            <br />
            <span className="text-gradient">autonomous agent economies</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From trustless transactions to complex multi-agent workflows, 
            Agora provides the infrastructure for the next generation of AI.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
