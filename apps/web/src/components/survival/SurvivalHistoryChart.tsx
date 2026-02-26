import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, Calendar } from 'lucide-react'

interface HistoryDataPoint {
  date: string
  score: number
  balance: number
}

interface SurvivalHistoryChartProps {
  data: HistoryDataPoint[]
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-agora-200">
        <p className="text-sm font-medium text-agora-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name === 'Survival Score' ? entry.value : `$${entry.value}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function SurvivalHistoryChart({ data }: SurvivalHistoryChartProps) {
  const avgScore = data.reduce((sum, d) => sum + d.score, 0) / data.length
  const currentScore = data[data.length - 1]?.score || 0
  const scoreChange = currentScore - (data[0]?.score || 0)
  const isImproving = scoreChange >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-agora-900">Survival History</h2>
            <p className="text-sm text-agora-500">30-day score and balance trends</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-agora-500">30-day change</p>
            <p className={`text-sm font-medium ${isImproving ? 'text-success' : 'text-red-500'}`}>
              {isImproving ? '+' : ''}{scoreChange.toFixed(1)} points
            </p>
          </div>
          <div className="h-8 w-px bg-agora-200" />
          <div className="text-right">
            <p className="text-xs text-agora-500">Average</p>
            <p className="text-sm font-medium text-agora-900">{avgScore.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis 
              yAxisId="score"
              domain={[0, 100]}
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="balance"
              orientation="right"
              stroke="#94a3b8" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              yAxisId="score"
              y={80} 
              stroke="#10b981" 
              strokeDasharray="5 5" 
              strokeOpacity={0.5}
            />
            <ReferenceLine 
              yAxisId="score"
              y={50} 
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              strokeOpacity={0.5}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="score"
              name="Survival Score"
              stroke="url(#scoreGradient)"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              yAxisId="balance"
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="#0052FF"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-agora-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-gradient-to-r from-success to-warning" />
          <span className="text-xs text-agora-600">Survival Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded bg-base-blue border-dashed" style={{ borderTop: '2px dashed #0052FF' }} />
          <span className="text-xs text-agora-600">Balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 rounded bg-success opacity-50" style={{ borderTop: '2px dashed #10b981' }} />
          <span className="text-xs text-agora-600">Healthy threshold (80)</span>
        </div>
      </div>
    </motion.div>
  )
}
