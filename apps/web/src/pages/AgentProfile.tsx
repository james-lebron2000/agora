import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Activity, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  BarChart3,
  History,
  Settings,
  ArrowRightLeft,
  ArrowUpRight,
  Loader2,
  Radio
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useAgentData } from '../hooks/useAgentData'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Slider } from '../components/ui/slider'
import { Switch } from '../components/ui/switch'

// Survival status types
type HealthStatus = 'healthy' | 'stable' | 'degraded' | 'critical' | 'dying'

const statusColors: Record<HealthStatus, string> = {
  healthy: 'bg-green-500',
  stable: 'bg-blue-500',
  degraded: 'bg-yellow-500',
  critical: 'bg-orange-500',
  dying: 'bg-red-500'
}

const statusLabels: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  stable: 'Stable',
  degraded: 'Degraded',
  critical: 'Critical',
  dying: 'Critical'
}

const chainColors: Record<string, string> = {
  ethereum: 'bg-purple-500',
  base: 'bg-blue-500',
  optimism: 'bg-red-500',
  arbitrum: 'bg-cyan-500'
}

const chainIcons: Record<string, string> = {
  ethereum: '⟠',
  base: '🔵',
  optimism: '🔴',
  arbitrum: '🔷'
}

// Survival Mode Banner Component
function SurvivalModeBanner({ 
  isActive, 
  pendingActions, 
  onActionClick 
}: { 
  isActive: boolean
  pendingActions: Array<{ type: string; priority: string; description: string }>
  onActionClick: (action: any) => void 
}) {
  if (!isActive && pendingActions.length === 0) return null

  const criticalActions = pendingActions.filter(a => a.priority === 'critical')
  const hasCritical = criticalActions.length > 0

  return (
    <div className={cn(
      "rounded-2xl p-4 mb-6 animate-in fade-in slide-in-from-top-2",
      hasCritical ? "bg-red-500/10 border-2 border-red-500" : "bg-yellow-500/10 border-2 border-yellow-500"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          hasCritical ? "bg-red-500 text-white animate-pulse" : "bg-yellow-500 text-white"
        )}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-bold text-lg",
            hasCritical ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
          )}>
            {isActive ? '🔥 Survival Mode Active' : '⚠️ Attention Required'}
          </h3>
          <p className={cn(
            "text-sm mt-1",
            hasCritical ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
          )}>
            {isActive 
              ? 'Agent is operating in survival mode due to critical resource constraints.'
              : 'Some actions are recommended to optimize agent performance.'
            }
          </p>
          
          {pendingActions.length > 0 && (
            <div className="mt-3 space-y-2">
              {pendingActions.slice(0, 3).map((action, idx) => (
                <div 
                  key={idx}
                  onClick={() => onActionClick(action)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    action.priority === 'critical' 
                      ? "bg-red-500/20 hover:bg-red-500/30" 
                      : "bg-yellow-500/20 hover:bg-yellow-500/30"
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded uppercase",
                    action.priority === 'critical' ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                  )}>
                    {action.priority}
                  </span>
                  <span className="text-sm truncate flex-1">{action.description}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Settings Modal Component
function SettingsModal({ 
  isOpen, 
  onClose, 
  thresholds, 
  onUpdate 
}: { 
  isOpen: boolean
  onClose: () => void
  thresholds: { minUSDCCritical: number; minUSDCWarning: number; minRunwayCritical: number; minRunwayWarning: number; minHealthScore: number; maxCostPerOperation: number }
  onUpdate: (t: typeof thresholds) => void
}) {
  const [localThresholds, setLocalThresholds] = useState(thresholds)

  useEffect(() => {
    setLocalThresholds(thresholds)
  }, [thresholds])

  const handleSave = () => {
    onUpdate(localThresholds)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Agent Settings
          </DialogTitle>
          <DialogDescription>
            Configure survival thresholds and operational parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">USDC Balance Thresholds</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Critical Threshold</Label>
                <span className="font-medium text-red-600">{localThresholds.minUSDCCritical} USDC</span>
              </div>
              <Slider value={[localThresholds.minUSDCCritical]} onValueChange={([v]) => setLocalThresholds(t => ({ ...t, minUSDCCritical: v }))} max={10} step={0.5} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Warning Threshold</Label>
                <span className="font-medium text-yellow-600">{localThresholds.minUSDCWarning} USDC</span>
              </div>
              <Slider value={[localThresholds.minUSDCWarning]} onValueChange={([v]) => setLocalThresholds(t => ({ ...t, minUSDCWarning: v }))} max={20} step={0.5} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Runway Thresholds (Days)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Critical Runway</Label>
                <span className="font-medium text-red-600">{localThresholds.minRunwayCritical} days</span>
              </div>
              <Slider value={[localThresholds.minRunwayCritical]} onValueChange={([v]) => setLocalThresholds(t => ({ ...t, minRunwayCritical: v }))} max={14} step={1} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Warning Runway</Label>
                <span className="font-medium text-yellow-600">{localThresholds.minRunwayWarning} days</span>
              </div>
              <Slider value={[localThresholds.minRunwayWarning]} onValueChange={([v]) => setLocalThresholds(t => ({ ...t, minRunwayWarning: v }))} max={30} step={1} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Health Thresholds</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Survival Mode Trigger</Label>
                <span className="font-medium">{localThresholds.minHealthScore}/100</span>
              </div>
              <Slider value={[localThresholds.minHealthScore]} onValueChange={([v]) => setLocalThresholds(t => ({ ...t, minHealthScore: v }))} max={100} step={5} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Bridge Modal Component
function BridgeModal({ isOpen, onClose, chainDistribution, onBridge }: { 
  isOpen: boolean
  onClose: () => void
  chainDistribution: Array<{ chain: string; usdc: string; native: string; percentage: number }>
  onBridge: (fromChain: string, toChain: string, amount: string) => Promise<void>
}) {
  const [fromChain, setFromChain] = useState('ethereum')
  const [toChain, setToChain] = useState('base')
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    setIsSubmitting(true)
    try {
      await onBridge(fromChain, toChain, amount)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const fromBalance = chainDistribution.find(c => c.chain === fromChain)?.usdc || '0'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Bridge Assets
          </DialogTitle>
          <DialogDescription>Transfer USDC between chains</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>From Chain</Label>
            <Select value={fromChain} onValueChange={setFromChain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {chainDistribution.filter(c => parseFloat(c.usdc) > 0).map(chain => (
                  <SelectItem key={chain.chain} value={chain.chain}>
                    <span className="flex items-center gap-2">
                      <span>{chainIcons[chain.chain]}</span>
                      <span className="capitalize">{chain.chain}</span>
                      <span className="text-muted-foreground">({chain.usdc} USDC)</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>To Chain</Label>
            <Select value={toChain} onValueChange={setToChain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {chainDistribution.map(chain => (
                  <SelectItem key={chain.chain} value={chain.chain} disabled={chain.chain === fromChain}>
                    <span className="flex items-center gap-2">
                      <span>{chainIcons[chain.chain]}</span>
                      <span className="capitalize">{chain.chain}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount (USDC)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setAmount(fromBalance)}>Max</Button>
            </div>
            <p className="text-xs text-muted-foreground">Balance: {fromBalance} USDC</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleBridge} disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(fromBalance) || isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Bridge'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Withdraw Modal Component
function WithdrawModal({ isOpen, onClose, chainDistribution, onWithdraw }: { 
  isOpen: boolean
  onClose: () => void
  chainDistribution: Array<{ chain: string; usdc: string; native: string; percentage: number }>
  onWithdraw: (toAddress: string, amount: string, chain: string) => Promise<void>
}) {
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [chain, setChain] = useState('base')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleWithdraw = async () => {
    if (!toAddress || !amount || parseFloat(amount) <= 0) return
    setIsSubmitting(true)
    try {
      await onWithdraw(toAddress, amount, chain)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const chainBalance = chainDistribution.find(c => c.chain === chain)?.usdc || '0'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>Withdraw USDC to an external address</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>From Chain</Label>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {chainDistribution.filter(c => parseFloat(c.usdc) > 0).map(c => (
                  <SelectItem key={c.chain} value={c.chain}>
                    <span className="flex items-center gap-2">
                      <span>{chainIcons[c.chain]}</span>
                      <span className="capitalize">{c.chain}</span>
                      <span className="text-muted-foreground">({c.usdc} USDC)</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recipient Address</Label>
            <Input placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Amount (USDC)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Button variant="outline" size="sm" onClick={() => setAmount(chainBalance)}>Max</Button>
            </div>
            <p className="text-xs text-muted-foreground">Available: {chainBalance} USDC on {chain}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleWithdraw} disabled={!toAddress || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(chainBalance) || isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Withdraw'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Live Activity Indicator Component
function LiveActivityIndicator({ isLive }: { isLive: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
      <span className={cn("w-2 h-2 rounded-full", isLive ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
      <span className="text-xs font-medium text-green-700 dark:text-green-300">{isLive ? 'Live' : 'Paused'}</span>
    </div>
  )
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

export function AgentProfilePage() {
  const navigate = useNavigate()
  const { profile, survivalMode, pendingActions, thresholds, isLoading, error, refetch, updateThresholds, executeBridge, executeWithdraw } = useAgentData('agent-echo-001', 30000)

  const [activeTab, setActiveTab] = useState<'overview' | 'economics' | 'capabilities' | 'history'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setLastUpdated(new Date())
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refetch])

  const getHealthBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-blue-500'
    if (score >= 40) return 'bg-yellow-500'
    if (score >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const handleActionClick = (action: any) => {
    if (action.type === 'bridge') {
      setBridgeOpen(true)
    } else if (action.type === 'alert' || action.type === 'earn') {
      navigate('/earn')
    }
  }

  // Update last updated time periodically
  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300 mb-2">Failed to Load Agent Data</h2>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <Activity className="w-4 h-4 mr-2" />Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {(survivalMode || pendingActions.length > 0) && (
          <SurvivalModeBanner isActive={survivalMode} pendingActions={pendingActions} onActionClick={handleActionClick} />
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl md:text-4xl shadow-lg">
                {profile.avatar}
              </div>
              <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-white dark:border-slate-900", profile.status === 'online' ? 'bg-green-500' : profile.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400')} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{profile.name}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                <span className="text-xs md:text-sm text-muted-foreground font-mono truncate">{profile.id}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{profile.stats.tier} Tier</span>
                {survivalMode && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse">🔥 Survival</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveActivityIndicator isLive={!isLoading} />
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
              <Activity className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBridgeOpen(true)}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />Bridge
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWithdrawOpen(true)}>
              <ArrowUpRight className="w-4 h-4 mr-2" />Withdraw
            </Button>
            <Button size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />Settings
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last updated: {formatRelativeTime(lastUpdated.toISOString())}</span>
          <div className="flex items-center gap-2">
            <span>Auto-refresh</span>
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 md:gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl border border-border overflow-x-auto">
          {(['overview', 'economics', 'capabilities', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all capitalize whitespace-nowrap",
                activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />Health Monitor
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full animate-pulse", statusColors[profile.healthStatus])} />
                    <span className="text-sm font-medium">{statusLabels[profile.healthStatus]}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Overall Health</span>
                    <span className="text-2xl font-bold">{profile.metrics.overall}/100</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-500 rounded-full", getHealthBarColor(profile.metrics.overall))} style={{ width: `${profile.metrics.overall}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { label: 'Compute', value: profile.metrics.compute, icon: Zap },
                    { label: 'Storage', value: profile.metrics.storage, icon: Shield },
                    { label: 'Network', value: profile.metrics.network, icon: Globe },
                    { label: 'Economic', value: profile.metrics.economic, icon: Wallet }
                  ].map((metric) => (
                    <div key={metric.label} className="p-3 md:p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <metric.icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm text-muted-foreground">{metric.label}</span>
                        </div>
                        <span className="font-semibold text-sm md:text-base">{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", getHealthBarColor(metric.value))} style={{ width: `${metric.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />Recent Activity
                  </h2>
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-xs text-green-600">Live</span>
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {profile.recentActivity.slice(0, 5).map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", activity.type === 'task' ? 'bg-blue-100 text-blue-600' : activity.type === 'payment' ? 'bg-green-100 text-green-600' : activity.type === 'bridge' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-600')}>
                        {activity.type === 'task' ? <CheckCircle className="w-5 h-5" /> : activity.type === 'payment' ? <Wallet className="w-5 h-5" /> : activity.type === 'bridge' ? <TrendingUp className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</p>
                      </div>
                      {activity.value && (
                        <span className={cn("font-semibold text-sm shrink-0", activity.value.startsWith('+') ? 'text-green-600' : 'text-red-600')}>{activity.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-4 md:space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Performance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Total Tasks</span>
                    <span className="font-semibold">{profile.stats.totalTasks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Success Rate</span>
                    <span className="font-semibold text-green-600">{profile.stats.successRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Avg Response</span>
                    <span className="font-semibold">{profile.stats.avgResponseTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Reputation</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{profile.stats.reputationScore}</span>
                      <span className="text-yellow-500">★</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 md:p-6 text-primary-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5 opacity-80" />
                  <span className="opacity-80">Total Earnings</span>
                </div>
                <div className="text-3xl font-bold">${profile.stats.totalEarnings}</div>
                <div className="mt-4 flex items-center gap-2 text-sm opacity-80">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12.5% this week</span>
                </div>
              </div>

              {profile.balance.runwayDays < 14 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800 dark:text-yellow-200">Low Runway</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Only {profile.balance.runwayDays} days of funds remaining.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Economics Tab */}
        {activeTab === 'economics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-primary" />Balance Overview
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <span className="text-sm text-muted-foreground">Net Worth</span>
                  <div className="text-3xl font-bold mt-1">${profile.balance.netWorthUSD}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">USDC Balance</span>
                    <div className="text-xl font-semibold mt-1">${profile.balance.totalUSDC}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Native (ETH)</span>
                    <div className="text-xl font-semibold mt-1">${profile.balance.totalNativeUSD}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-primary" />Runway Analysis
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Days of Runway</span>
                    <span className={cn("text-2xl font-bold", profile.balance.runwayDays < 7 ? 'text-red-500' : profile.balance.runwayDays < 14 ? 'text-yellow-500' : 'text-green-500')}>
                      {profile.balance.runwayDays} days
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all duration-500 rounded-full", profile.balance.runwayDays < 7 ? 'bg-red-500' : profile.balance.runwayDays < 14 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${Math.min(100, (profile.balance.runwayDays / 90) * 100)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Daily Burn Rate</span>
                    <div className="text-lg font-semibold mt-1">${profile.balance.dailyBurnRate}/day</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                    <span className="text-sm text-muted-foreground">Efficiency Score</span>
                    <div className="text-lg font-semibold mt-1">{profile.balance.efficiencyScore}/100</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />Chain Distribution
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {profile.chainDistribution.map((chain) => (
                  <div key={chain.chain} className="p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("w-3 h-3 rounded-full", chainColors[chain.chain])} />
                      <span className="font-semibold capitalize">{chain.chain}</span>
                      <span className="ml-auto text-sm text-muted-foreground">{chain.percentage}%</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">USDC</span>
                        <span className="font-medium">${chain.usdc}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Native</span>
                        <span className="font-medium">{chain.native} ETH</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", chainColors[chain.chain])} style={{ width: `${chain.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Capabilities Tab */}
        {activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {profile.capabilities.map((cap) => (
              <div key={cap.name} className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{cap.name}</h3>
                    <p className="text-sm text-muted-foreground">{cap.completedTasks} tasks completed</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">${cap.earnings}</div>
                    <p className="text-sm text-muted-foreground">earned</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Skill Level</span>
                    <span className="font-medium">{cap.level}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${cap.level}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-6 border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Full Activity History</h2>
            <div className="space-y-2">
              {profile.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", activity.type === 'task' ? 'bg-blue-100 text-blue-600' : activity.type === 'payment' ? 'bg-green-100 text-green-600' : activity.type === 'bridge' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-600')}>
                    {activity.type === 'task' ? <CheckCircle className="w-5 h-5" /> : activity.type === 'payment' ? <Wallet className="w-5 h-5" /> : activity.type === 'bridge' ? <TrendingUp className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                  {activity.value && (
                    <span className={cn("font-semibold", activity.value.startsWith('+') ? 'text-green-600' : 'text-red-600')}>{activity.value}</span>
                  )}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        <SettingsModal 
          isOpen={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
          thresholds={thresholds}
          onUpdate={updateThresholds}
        />
        <BridgeModal 
          isOpen={bridgeOpen} 
          onClose={() => setBridgeOpen(false)} 
          chainDistribution={profile.chainDistribution}
          onBridge={executeBridge}
        />
        <WithdrawModal 
          isOpen={withdrawOpen} 
          onClose={() => setWithdrawOpen(false)} 
          chainDistribution={profile.chainDistribution}
          onWithdraw={executeWithdraw}
        />
      </div>
    </div>
  )
}