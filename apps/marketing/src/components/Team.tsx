"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

const teamMembers = [
  {
    name: "Alex Chen",
    role: "Founder & CEO",
    bio: "Former ML lead at OpenAI. 10+ years in distributed systems and AI research.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    github: "alexchen",
    twitter: "alexchen",
    linkedin: "alexchen",
  },
  {
    name: "Sarah Kim",
    role: "CTO",
    bio: "Blockchain architect with 8+ years experience. Previously at Ethereum Foundation.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
    github: "sarahkim",
    twitter: "sarahkim",
    linkedin: "sarahkim",
  },
  {
    name: "Marcus Johnson",
    role: "Head of Protocol",
    bio: "Smart contract specialist. Built DeFi protocols handling $1B+ TVL.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face",
    github: "marcusj",
    twitter: "marcusj",
    linkedin: "marcusj",
  },
  {
    name: "Elena Rodriguez",
    role: "Lead AI Researcher",
    bio: "PhD in Machine Learning. Published 20+ papers on multi-agent systems.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
    github: "elenar",
    twitter: "elenar",
    linkedin: "elenar",
  },
  {
    name: "David Park",
    role: "Head of Engineering",
    bio: "Former Google engineer. Expert in scalable distributed systems.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    github: "davidpark",
    twitter: "davidpark",
    linkedin: "davidpark",
  },
  {
    name: "Lisa Wang",
    role: "Head of Growth",
    bio: "Former VP at Coinbase. Built communities of 1M+ users.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
    github: "lisawang",
    twitter: "lisawang",
    linkedin: "lisawang",
  },
];

const advisors = [
  {
    name: "Dr. James Wilson",
    role: "Technical Advisor",
    bio: "Professor of CS at MIT. Pioneer in consensus algorithms.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face",
    linkedin: "jwilson",
  },
  {
    name: "Rachel Green",
    role: "Strategy Advisor",
    bio: "Partner at a16z crypto. Ex-McKinsey.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
    linkedin: "rgreen",
  },
];

function TeamCard({ member }: { member: typeof teamMembers[0] }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10"
    >
      {/* Avatar */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
        <img
          src={member.image}
          alt={member.name}
          className="relative w-full h-full rounded-full object-cover border-2 border-slate-700 group-hover:border-violet-500/50 transition-colors duration-300"
        />
      </div>

      {/* Info */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
        <p className="text-violet-400 text-sm mb-3">{member.role}</p>
        <p className="text-slate-400 text-sm mb-4 line-clamp-2">{member.bio}</p>

        {/* Social links */}
        <div className="flex items-center justify-center gap-3">
          {member.github && (
            <Link
              href={`https://github.com/${member.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-violet-500/20 hover:text-violet-400 transition-colors duration-200"
            >
              <Github className="w-4 h-4" />
            </Link>
          )}
          {member.twitter && (
            <Link
              href={`https://twitter.com/${member.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors duration-200"
            >
              <Twitter className="w-4 h-4" />
            </Link>
          )}
          {member.linkedin && (
            <Link
              href={`https://linkedin.com/in/${member.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 transition-colors duration-200"
            >
              <Linkedin className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Team() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" className="py-24 lg:py-32 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/20 to-slate-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm mb-6">
            Team
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Built by experts in
            <br />
            <span className="text-gradient">AI and Blockchain</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            World-class team with deep expertise in artificial intelligence, 
            distributed systems, and decentralized finance.
          </p>
        </motion.div>

        {/* Team grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
            >
              <TeamCard member={member} />
            </motion.div>
          ))}
        </motion.div>

        {/* Advisors section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-8"
        >
          <h3 className="text-2xl font-bold text-white mb-8">Advisors</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
        >
          {advisors.map((advisor, index) => (
            <motion.div
              key={advisor.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 + 0.1 * index, duration: 0.5 }}
            >
              <div className="group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/10">
                <div className="flex items-center gap-4">
                  <img
                    src={advisor.image}
                    alt={advisor.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-700 group-hover:border-emerald-500/50 transition-colors duration-300"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{advisor.name}</h4>
                    <p className="text-emerald-400 text-sm">{advisor.role}</p>
                    <p className="text-slate-400 text-sm mt-1">{advisor.bio}</p>
                  </div>
                  {advisor.linkedin && (
                    <Link
                      href={`https://linkedin.com/in/${advisor.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 transition-colors duration-200"
                    >
                      <Linkedin className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
