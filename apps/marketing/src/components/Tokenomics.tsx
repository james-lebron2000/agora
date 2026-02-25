"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Coins, TrendingUp, Users, Lock, Wallet } from "lucide-react";

const tokenDistribution = [
  { name: "Community Rewards", value: 35, color: "#8b5cf6" },
  { name: "Ecosystem Growth", value: 20, color: "#06b6d4" },
  { name: "Team & Advisors", value: 15, color: "#d946ef" },
  { name: "Staking Rewards", value: 15, color: "#10b981" },
  { name: "Private Sale", value: 10, color: "#f59e0b" },
  { name: "Public Sale", value: 5, color: "#f43f5e" },
];

const vestingSchedule = [
  { month: "Launch", team: 0, ecosystem: 5, community: 10 },
  { month: "6M", team: 5, ecosystem: 15, community: 25 },
  { month: "12M", team: 15, ecosystem: 30, community: 40 },
  { month: "18M", team: 25, ecosystem: 45, community: 55 },
  { month: "24M", team: 40, ecosystem: 60, community: 70 },
  { month: "36M", team: 60, ecosystem: 80, community: 85 },
  { month: "48M", team: 80, ecosystem: 95, community: 95 },
  { month: "60M", team: 100, ecosystem: 100, community: 100 },
];

const tokenMetrics = [
  { label: "Total Supply", value: "1,000,000,000", icon: Coins, suffix: "AGORA" },
  { label: "Initial Market Cap", value: "$5M", icon: Wallet },
  { label: "Staking APY", value: "15%", icon: TrendingUp },
  { label: "Holders", value: "25,000+", icon: Users },
];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium">{payload[0].name}</p>
        <p className="text-violet-400">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export function Tokenomics() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState<"distribution" | "vesting">("distribution");

  return (
    <section id="tokenomics" className="py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-violet-950/10 to-slate-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm mb-6">
            Tokenomics
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Sustainable token economy
            <br />
            <span className="text-gradient">designed for growth</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            AGORA token powers the entire ecosystem with fair distribution, 
            transparent vesting, and long-term value accrual mechanisms.
          </p>
        </motion.div>

        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-16"
        >
          {tokenMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm text-center"
            >
              <metric.icon className="w-8 h-8 text-violet-400 mx-auto mb-3" />
              <div className="text-2xl lg:text-3xl font-bold text-white mb-1">{metric.value}</div>
              <div className="text-sm text-slate-400">{metric.label}</div>
              {metric.suffix && (
                <div className="text-xs text-violet-400 mt-1">{metric.suffix}</div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="p-6 lg:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm"
          >
            <h3 className="text-xl font-bold text-white mb-6">Token Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tokenDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {tokenDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-400 text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Vesting Chart */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="p-6 lg:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm"
          >
            <h3 className="text-xl font-bold text-white mb-6">Vesting Schedule</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vestingSchedule}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b"
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#cbd5e1' }}
                  />
                  <Bar dataKey="team" name="Team & Advisors" fill="#d946ef" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ecosystem" name="Ecosystem" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="community" name="Community" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Distribution breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 p-6 lg:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-white mb-4">Distribution Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {tokenDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.value}%</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
