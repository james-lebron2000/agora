import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const priceData = [
  { date: 'Jan 1', price: 0.08 },
  { date: 'Jan 5', price: 0.10 },
  { date: 'Jan 10', price: 0.12 },
  { date: 'Jan 15', price: 0.11 },
  { date: 'Jan 20', price: 0.14 },
  { date: 'Jan 25', price: 0.13 },
  { date: 'Jan 30', price: 0.15 },
];

const stakingData = [
  { name: 'Platinum', value: 150, color: '#6366f1' },
  { name: 'Gold', value: 300, color: '#f59e0b' },
  { name: 'Silver', value: 450, color: '#94a3b8' },
  { name: 'Bronze', value: 600, color: '#b45309' },
  { name: 'Unstaked', value: 200, color: '#64748b' },
];

const burnData = [
  { day: 'Mon', amount: 120000 },
  { day: 'Tue', amount: 145000 },
  { day: 'Wed', amount: 98000 },
  { day: 'Thu', amount: 167000 },
  { day: 'Fri', amount: 134000 },
  { day: 'Sat', amount: 89000 },
  { day: 'Sun', amount: 156000 },
];

const topStakers = [
  { rank: 1, address: '0x7A8b...D8e2', amount: '2.5M', share: '12.5%', reward: '$12.4K' },
  { rank: 2, address: '0x3F4a...B2c1', amount: '1.8M', share: '9.0%', reward: '$8.9K' },
  { rank: 3, address: '0x9E5c...A7d3', amount: '1.2M', share: '6.0%', reward: '$5.9K' },
];

export function Analytics() {
  const [isLive, setIsLive] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tokenomics Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time AGORA token metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <p className="text-slate-400 text-sm">Total Revenue</p>
            <p className="text-2xl font-bold text-green-400">$1.24M</p>
            <p className="text-xs text-slate-500">All time</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <p className="text-slate-400 text-sm">Daily Revenue</p>
            <p className="text-2xl font-bold">$8,432</p>
            <p className="text-xs text-green-500">+12.5% vs yesterday</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <p className="text-slate-400 text-sm">Total Staked</p>
            <p className="text-2xl font-bold text-indigo-400">15.2M AGORA</p>
            <p className="text-xs text-slate-500">1,847 stakers</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <p className="text-slate-400 text-sm">Staking APY</p>
            <p className="text-2xl font-bold text-yellow-400">23.4%</p>
            <p className="text-xs text-green-500">+2.1% this week</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Chart */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Token Price (30d)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                <Area type="monotone" dataKey="price" stroke="#6366f1" fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Staking Distribution */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Staking Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stakingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {stakingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burn History & Top Stakers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Burn History */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Burn History (7d)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={burnData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center mt-4 text-slate-400">
              Total Burned: <span className="text-red-400 font-bold">911,000 AGORA</span>
            </p>
          </div>

          {/* Top Stakers */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h3 className="text-lg font-semibold mb-4">Top Stakers</h3>
            <div className="space-y-3">
              {topStakers.map((staker) => (
                <div key={staker.rank} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {staker.rank === 1 ? '🥇' : staker.rank === 2 ? '🥈' : staker.rank === 3 ? '🥉' : `#${staker.rank}`}
                    </span>
                    <div>
                      <p className="font-mono text-sm">{staker.address}</p>
                      <p className="text-xs text-slate-400">{staker.share} of total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-400">{staker.amount}</p>
                    <p className="text-xs text-green-400">{staker.reward}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
