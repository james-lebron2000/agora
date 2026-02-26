import { motion } from 'framer-motion'
import { Heart, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'

interface SurvivalScoreCardProps {
  score: number
  healthScore: number
  economicsScore: number
  status: 'healthy' | 'degraded' | 'critical' | 'dead'
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-success'
  if (score >= 50) return 'text-warning'
  if (score >= 20) return 'text-red-500'
  return 'text-agora-400'
}

const getScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-success-light'
  if (score >= 50) return 'bg-warning-light'
  if (score >= 20) return 'bg-red-100'
  return 'bg-agora-100'
}

const getScoreGradient = (score: number): string => {
  if (score >= 80) return 'from-emerald-500 to-emerald-600'
  if (score >= 50) return 'from-amber-500 to-amber-600'
  if (score >= 20) return 'from-red-500 to-red-600'
  return 'from-agora-400 to-agora-500'
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <TrendingUp className="w-4 h-4" />
    case 'degraded':
      return <Minus className="w-4 h-4" />
    case 'critical':
      return <TrendingDown className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

export function SurvivalScoreCard({ score, healthScore, economicsScore, status }: SurvivalScoreCardProps) {
  const circumference = 2 * Math.PI * 52
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-agora-200 shadow-sm"
    >
      <div className="flex items-center gap-4">
        {/* Circular Progress */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-agora-100"
            />
            {/* Progress circle */}
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={getScoreColor(score)}
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className="text-xs text-agora-400">/100</span>
          </div>
        </div>

        {/* Score details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${getScoreBg(score)} flex items-center justify-center`}>
              <Heart className={`w-4 h-4 ${getScoreColor(score)}`} />
            </div>
            <div>
              <h3 className="font-semibold text-agora-900">Survival Score</h3>
              <div className={`flex items-center gap-1 text-xs capitalize ${getScoreColor(score)}`}>
                {getStatusIcon(status)}
                <span>{status}</span>
              </div>
            </div>
          </div>

          {/* Component scores */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-agora-500">Health</span>
                <span className="font-medium text-agora-900">{healthScore}%</span>
              </div>
              <div className="h-1.5 bg-agora-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${healthScore}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className={`h-full rounded-full ${
                    healthScore >= 80 ? 'bg-success' : 
                    healthScore >= 50 ? 'bg-warning' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-agora-500">Economics</span>
                <span className="font-medium text-agora-900">{economicsScore}%</span>
              </div>
              <div className="h-1.5 bg-agora-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${economicsScore}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={`h-full rounded-full ${
                    economicsScore >= 80 ? 'bg-success' : 
                    economicsScore >= 50 ? 'bg-warning' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score interpretation */}
      <div className="mt-4 pt-4 border-t border-agora-100">
        <p className="text-xs text-agora-500">
          {score >= 80 ? (
            <span className="text-success">Your agent is in excellent condition. Keep up the great work!</span>
          ) : score >= 50 ? (
            <span className="text-warning">Your agent is stable but has room for improvement.</span>
          ) : score >= 20 ? (
            <span className="text-red-500">Your agent needs attention. Check recommendations below.</span>
          ) : (
            <span className="text-agora-400">Your agent is offline or inactive.</span>
          )}
        </p>
      </div>
    </motion.div>
  )
}
