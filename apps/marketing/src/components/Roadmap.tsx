"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { 
  Rocket, 
  Sparkles, 
  Zap, 
  Globe, 
  CheckCircle2, 
  Circle,
  Clock,
  Target
} from "lucide-react";

const roadmapData = [
  {
    phase: "Phase 1",
    title: "Foundation",
    period: "Q1-Q2 2024",
    status: "completed",
    icon: Rocket,
    items: [
      "Core protocol development",
      "Smart contract audit",
      "Testnet launch",
      "Community building",
      "Whitepaper release",
    ],
  },
  {
    phase: "Phase 2",
    title: "Launch",
    period: "Q3-Q4 2024",
    status: "completed",
    icon: Sparkles,
    items: [
      "Mainnet deployment",
      "AGORA token launch",
      "Staking platform release",
      "Initial DEX offering",
      "First agent partnerships",
    ],
  },
  {
    phase: "Phase 3",
    title: "Expansion",
    period: "Q1-Q2 2025",
    status: "in-progress",
    icon: Zap,
    items: [
      "A2A protocol v2",
      "Cross-chain bridges",
      "Mobile SDK release",
      "Enterprise partnerships",
      "Governance launch",
    ],
  },
  {
    phase: "Phase 4",
    title: "Mass Adoption",
    period: "Q3-Q4 2025",
    status: "upcoming",
    icon: Globe,
    items: [
      "AI marketplace launch",
      "Fiat on-ramps",
      "Institutional custody",
      "Global compliance",
      "ProtocolDAO activation",
    ],
  },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Completed",
  },
  "in-progress": {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "In Progress",
  },
  upcoming: {
    icon: Circle,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    label: "Upcoming",
  },
};

function RoadmapCard({ 
  item, 
  index 
}: { 
  item: typeof roadmapData[0]; 
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const status = statusConfig[item.status as keyof typeof statusConfig];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-start lg:items-center gap-6 lg:gap-12`}
    >
      {/* Timeline dot */}
      <div className="absolute left-4 lg:left-1/2 lg:-translate-x-1/2 top-0 lg:top-1/2 lg:-translate-y-1/2 z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
          className={`w-4 h-4 rounded-full ${status.bg.replace('/10', '')} border-2 border-slate-900`}
        />
      </div>

      {/* Content card */}
      <div className={`lg:w-[calc(50%-2rem)] ml-12 lg:ml-0 ${index % 2 === 0 ? 'lg:pr-8' : 'lg:pl-8'}`}>
        <div className={`p-6 rounded-2xl ${status.bg} border ${status.border} backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} mb-2`}>
                <status.icon className="w-3.5 h-3.5" />
                {status.label}
              </span>
              <h3 className="text-xl font-bold text-white">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.period}</p>
            </div>
            <div className={`p-3 rounded-xl ${status.bg}`}>
              <item.icon className={`w-6 h-6 ${status.color}`} />
            </div>
          </div>

          {/* Items */}
          <ul className="space-y-2">
            {item.items.map((listItem, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <div className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text-', 'bg-')} mt-1.5 flex-shrink-0`} />
                {listItem}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Empty space for alternating layout */}
      <div className="hidden lg:block lg:w-[calc(50%-2rem)]" />
    </motion.div>
  );
}

export function Roadmap() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="roadmap" className="py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-sm mb-6">
            Roadmap
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Our journey to
            <br />
            <span className="text-gradient">decentralized AI</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A clear path from protocol development to mass adoption, 
            with major milestones and community-driven governance.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-5 lg:left-1/2 lg:-translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-amber-500 to-slate-700" />

          {/* Roadmap items */}
          <div className="space-y-8 lg:space-y-12">
            {roadmapData.map((item, index) => (
              <RoadmapCard key={item.phase} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
