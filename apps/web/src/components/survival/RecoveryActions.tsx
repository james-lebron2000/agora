import { motion } from 'framer-motion'
import { 
  Lightbulb, 
  Zap, 
  ArrowRight, 
  AlertTriangle, 
  Coins,
  TrendingUp,
  Settings,
  ExternalLink
} from 'lucide-react'

interface RecoveryActionsProps {
  recommendations: string[]
  needsEmergencyFunding: boolean
}

const getActionIcon = (recommendation: string) => {
  if (recommendation.toLowerCase().includes('fund')) return Coins
  if (recommendation.toLowerCase().includes('earn') || recommendation.toLowerCase().includes('revenue')) return TrendingUp
  if (recommendation.toLowerCase().includes('cost') || recommendation.toLowerCase().includes('gas')) return Settings
  if (recommendation.toLowerCase().includes('improv') || recommendation.toLowerCase().includes('optim')) return Zap
  return Lightbulb
}

const getActionButton = (recommendation: string) => {
  if (recommendation.toLowerCase().includes('fund')) {
    return {
      label: 'Request Funds',
      action: () => console.log('Request emergency funding'),
      primary: true
    }
  }
  if (recommendation.toLowerCase().includes('task')) {
    return {
      label: 'View Tasks',
      action: () => console.log('View available tasks'),
      primary: false
    }
  }
  if (recommendation.toLowerCase().includes('gas') || recommendation.toLowerCase().includes('cost')) {
    return {
      label: 'Optimize',
      action: () => console.log('Optimize gas settings'),
      primary: false
    }
  }
  return null
}

export function RecoveryActions({ recommendations, needsEmergencyFunding }: RecoveryActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          needsEmergencyFunding ? 'bg-red-100' : 'bg-base-light'
        }`}>
          <Lightbulb className={`w-6 h-6 ${needsEmergencyFunding ? 'text-red-500' : 'text-base-blue'}`} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-agora-900">
            {needsEmergencyFunding ? 'Urgent Actions' : 'Recommendations'}
          </h2>
          <p className="text-sm text-agora-500">
            {needsEmergencyFunding 
              ? 'Immediate action required to ensure survival'
              : 'Suggestions to improve your agent performance'
            }
          </p>
        </div>
      </div>

      {/* Emergency Funding Banner */}
      {needsEmergencyFunding && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">Emergency Funding Required</h3>
              <p className="text-sm text-red-700 mb-3">
                Your agent is at risk of becoming inactive. Request emergency funds or increase task completion.
              </p>
              <button className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                <Coins className="w-4 h-4" />
                Request Emergency Funding
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations List */}
      <div className="space-y-3">
        {recommendations.map((recommendation, index) => {
          const Icon = getActionIcon(recommendation)
          const action = getActionButton(recommendation)
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="p-4 bg-agora-50 rounded-xl group hover:bg-base-light transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon className="w-4 h-4 text-base-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-agora-700 leading-relaxed">{recommendation}</p>
                  
                  {action && (
                    <button
                      onClick={action.action}
                      className={`mt-3 text-xs font-medium flex items-center gap-1 transition-colors ${
                        action.primary 
                          ? 'text-red-600 hover:text-red-700' 
                          : 'text-base-blue hover:text-blue-700'
                      }`}
                    >
                      {action.label}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Tips */}
      <div className="mt-6 pt-6 border-t border-agora-100">
        <h3 className="text-sm font-medium text-agora-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" />
          Quick Tips
        </h3>
        <div className="space-y-2">
          <a 
            href="#" 
            className="flex items-center justify-between p-3 bg-agora-50 rounded-lg text-sm text-agora-600 hover:bg-base-light hover:text-base-blue transition-colors group"
          >
            <span>How to maximize earnings</span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <a 
            href="#" 
            className="flex items-center justify-between p-3 bg-agora-50 rounded-lg text-sm text-agora-600 hover:bg-base-light hover:text-base-blue transition-colors group"
          >
            <span>Reducing gas costs guide</span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <a 
            href="#" 
            className="flex items-center justify-between p-3 bg-agora-50 rounded-lg text-sm text-agora-600 hover:bg-base-light hover:text-base-blue transition-colors group"
          >
            <span>Understanding survival scores</span>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </motion.div>
  )
}
