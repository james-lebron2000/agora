/**
 * Manual Action Triggers Component
 * Allows users to manually trigger survival actions
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Zap, 
  Coins, 
  Settings, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { useSurvival } from '@/hooks/useSurvival'

interface ManualActionTriggerProps {
  className?: string
  onActionComplete?: (actionType: string, success: boolean) => void
}

interface ActionButton {
  id: string
  type: string
  title: string
  description: string
  icon: React.ComponentType<any>
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  requiresConfirmation?: boolean
  disabled?: boolean
  tooltip?: string
}

const actionButtons: ActionButton[] = [
  {
    id: 'bridge',
    type: 'bridge',
    title: 'Auto-Bridge Funds',
    description: 'Move funds from other chains to primary chain',
    icon: Coins,
    color: 'blue',
    requiresConfirmation: true,
    tooltip: 'Automatically bridge funds when balance is low'
  },
  {
    id: 'optimize-chain',
    type: 'optimize_chain',
    title: 'Optimize Chain',
    description: 'Switch to optimal chain for operations',
    icon: Zap,
    color: 'green',
    tooltip: 'Use the chain with best gas costs and success rates'
  },
  {
    id: 'reduce-cost',
    type: 'reduce_cost',
    title: 'Reduce Costs',
    description: 'Lower operational expenses temporarily',
    icon: DollarSign,
    color: 'orange',
    tooltip: 'Reduce daily burn rate by 30%'
  },
  {
    id: 'earn-mode',
    type: 'earn',
    title: 'Earn Mode',
    description: 'Enable aggressive task acceptance',
    icon: TrendingUp,
    color: 'purple',
    tooltip: 'Accept more tasks to increase revenue'
  },
  {
    id: 'emergency-alert',
    type: 'alert',
    title: 'Emergency Alert',
    description: 'Send critical alert to operators',
    icon: AlertCircle,
    color: 'red',
    requiresConfirmation: true,
    tooltip: 'Notify human operators of critical issues'
  }
]

const getColorClasses = (color: string) => {
  switch (color) {
    case 'blue':
      return 'bg-blue-600 hover:bg-blue-700 text-white'
    case 'green':
      return 'bg-green-600 hover:bg-green-700 text-white'
    case 'orange':
      return 'bg-orange-600 hover:bg-orange-700 text-white'
    case 'red':
      return 'bg-red-600 hover:bg-red-700 text-white'
    case 'purple':
      return 'bg-purple-600 hover:bg-purple-700 text-white'
    default:
      return 'bg-agora-600 hover:bg-agora-700 text-white'
  }
}

interface ActionState {
  id: string
  status: 'idle' | 'executing' | 'completed' | 'failed'
  message?: string
  timestamp?: number
}

export function ManualActionTrigger({ 
  className = '', 
  onActionComplete 
}: ManualActionTriggerProps) {
  const { triggerManualAction, survivalData } = useSurvival()
  const [executingActions, setExecutingActions] = useState<Set<string>>(new Set())
  const [actionStates, setActionStates] = useState<ActionState[]>([])
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null)

  const handleActionClick = async (action: ActionButton) => {
    if (action.requiresConfirmation) {
      setConfirmingAction(action.id)
      return
    }

    await executeAction(action)
  }

  const executeAction = async (action: ActionButton) => {
    setExecutingActions(prev => new Set(prev).add(action.id))
    
    setActionStates(prev => [{
      id: action.id,
      status: 'executing',
      message: `Executing ${action.title}...`,
      timestamp: Date.now()
    }, ...prev.slice(-4)])

    try {
      await triggerManualAction(action.type, {
        description: action.description
      })

      setActionStates(prev => [{
        id: action.id,
        status: 'completed',
        message: `${action.title} completed successfully`,
        timestamp: Date.now()
      }, ...prev.slice(-4)])

      onActionComplete?.(action.type, true)
    } catch (error) {
      setActionStates(prev => [{
        id: action.id,
        status: 'failed',
        message: `${action.title} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }, ...prev.slice(-4)])

      onActionComplete?.(action.type, false)
    } finally {
      setExecutingActions(prev => {
        const next = new Set(prev)
        next.delete(action.id)
        return next
      })
    }
  }

  const confirmAction = () => {
    if (confirmingAction) {
      const action = actionButtons.find(a => a.id === confirmingAction)
      if (action) {
        executeAction(action)
      }
      setConfirmingAction(null)
    }
  }

  const cancelConfirmation = () => {
    setConfirmingAction(null)
  }

  if (!survivalData) {
    return (
      <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-agora-500">Loading survival data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-agora-200 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-agora-900">Manual Actions</h3>
        <p className="text-sm text-agora-500">
          Trigger survival actions manually when needed
        </p>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {actionButtons.map((action) => {
          const Icon = action.icon
          const isExecuting = executingActions.has(action.id)
          const isDisabled = action.disabled || isExecuting
          
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActionClick(action)}
              disabled={isDisabled}
              title={action.tooltip}
              className={`
                p-4 rounded-xl border border-agora-200 bg-white
                hover:shadow-md transition-all duration-200
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                text-left
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getColorClasses(action.color)} flex items-center justify-center flex-shrink-0`}>
                  {isExecuting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-agora-900 mb-1">{action.title}</h4>
                  <p className="text-sm text-agora-600">{action.description}</p>
                  {action.requiresConfirmation && (
                    <span className="text-xs text-orange-600 mt-1 inline-block">
                      Requires confirmation
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmingAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl p-6 max-w-md mx-4 border border-agora-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-agora-900">Confirm Action</h3>
              </div>
              <p className="text-agora-700 mb-6">
                This action will trigger a manual intervention. Make sure you understand the implications.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmAction}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Confirm & Execute
                </button>
                <button
                  onClick={cancelConfirmation}
                  className="flex-1 py-2.5 bg-agora-100 text-agora-700 rounded-lg font-medium hover:bg-agora-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action History */}
      {actionStates.length > 0 && (
        <div className="mt-6 pt-6 border-t border-agora-100">
          <h4 className="font-medium text-agora-900 mb-3">Recent Actions</h4>
          <div className="space-y-2">
            <AnimatePresence>
              {actionStates.map((state) => {
                const iconMap = {
                  executing: <Clock className="w-4 h-4 text-blue-500" />,
                  completed: <CheckCircle className="w-4 h-4 text-green-500" />,
                  failed: <XCircle className="w-4 h-4 text-red-500" />
                }
                
                return (
                  <motion.div
                    key={state.id + state.status}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3 p-3 bg-agora-50 rounded-lg"
                  >
                    {iconMap[state.status]}
                    <div className="flex-1">
                      <p className="text-sm text-agora-900">{state.message}</p>
                      {state.timestamp && (
                        <p className="text-xs text-agora-500">
                          {new Date(state.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Survival Mode Warning */}
      {survivalData.status === 'critical' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Survival Mode Active</h4>
              <p className="text-sm text-red-700">
                Your agent is in critical condition. Manual actions may be necessary.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
