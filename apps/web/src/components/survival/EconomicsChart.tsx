import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, Flame } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface EconomicMetrics {
  totalEarned: string
  totalSpent: string
  currentBalance: string
  minSurvivalBalance: string
  dailyBurnRate: string
  daysOfRunway: number
}

interface EconomicsChartProps {
  metrics: EconomicMetrics
}

// Mock chart data - in production this would come from API
const generateChartData = () => {
  const data = []
  let balance = 500
  for (let i = 30; i >= 0; i--) {
    const earned = Math.random() * 50 + 20
    const spent = Math.random() * 30 + 10
    balance += earned - spent
    data.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: Math.max(0, balance),
      earned: earned,
      spent: spent
    })
  }
  return data
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-agora-200">
        <p className="text-sm font-medium text-agora-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toFixed(2)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function EconomicsChart({ metrics }: EconomicsChartProps) {
  const chartData = generateChartData()
  const profit = parseFloat(metrics.totalEarned) - parseFloat(metrics.totalSpent)
  const isProfitable = profit > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-usdc-light flex items-center justify-center">
            <Wallet className="w-6 h-6 text-usdc" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-agora-900">Economic Metrics</h2>
            <p className="text-sm text-agora-500">Revenue, expenses & runway</p>
          </div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 ${
          isProfitable ? 'bg-success-light text-success' : 'bg-red-50 text-red-500'
        }`}>
          {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm font-medium">{isProfitable ? '+' : ''}${profit.toFixed(2)} net</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-success-light/50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-xs text-agora-500">Total Earned</span>
          </div>
          <p className="text-xl font-bold text-success">${metrics.totalEarned}</p>
        </div>
        
        <div className="p-4 bg-red-50 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-agora-500">Total Spent</span>
          </div>
          <p className="text-xl font-bold text-red-500">${metrics.totalSpent}</p>
        </div>
        
        <div className="p-4 bg-base-light rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="w-4 h-4 text-base-blue" />
            <span className="text-xs text-agora-500">Balance</span>
          </div>
          <p className="text-xl font-bold text-base-blue">${metrics.currentBalance}</p>
        </div>
      </div>

      {/* Burn Rate & Runway */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-agora-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Flame className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xs text-agora-500">Daily Burn Rate</p>
            <p className="text-lg font-bold text-agora-900">${metrics.dailyBurnRate}</p>
          </div>
        </div>
        
        <div className="h-10 w-px bg-agora-200" />
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-agora-500">Min Survival Balance</p>
            <p className="text-lg font-bold text-agora-900">${metrics.minSurvivalBalance}</p>
          </div>
        </div>
        
        <div className="h-10 w-px bg-agora-200" />
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-agora-500">Runway</span>
            <span className={`text-sm font-medium ${
              metrics.daysOfRunway < 14 ? 'text-red-500' : 
              metrics.daysOfRunway < 30 ? 'text-warning' : 'text-success'
            }`}>
              {metrics.daysOfRunway} days
            </span>
          </div>
          <div className="h-2 bg-agora-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(metrics.daysOfRunway / 90 * 100, 100)}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${
                metrics.daysOfRunway < 14 ? 'bg-red-500' : 
                metrics.daysOfRunway < 30 ? 'bg-warning' : 'bg-success'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0052FF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0052FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#0052FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
