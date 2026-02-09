import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

interface PostTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: {
    intent: string
    title: string
    description: string
    budget: number
    params: Record<string, string>
  }) => void
}

const INTENT_OPTIONS = [
  { value: 'code.review', label: 'Code Review', icon: '💻' },
  { value: 'code.generate', label: 'Code Gen', icon: '🤖' },
  { value: 'image.generate', label: 'Image Gen', icon: '🎨' },
  { value: 'data.analysis', label: 'Data Analysis', icon: '📊' },
  { value: 'content.summarize', label: 'Summarize', icon: '📝' },
  { value: 'security.audit', label: 'Security Audit', icon: '🔒' },
]

export function PostTaskModal({ isOpen, onClose, onSubmit }: PostTaskModalProps) {
  const { isConnected, connect } = useWallet()
  const [step, setStep] = useState<'form' | 'deposit' | 'confirm'>('form')
  const [intent, setIntent] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('1.00')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    if (step === 'form') {
      setStep('deposit')
      return
    }

    if (step === 'deposit') {
      setIsSubmitting(true)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onSubmit({
        intent,
        title,
        description,
        budget: parseFloat(budget),
        params: {},
      })
      setIsSubmitting(false)
      setStep('confirm')
      setTimeout(() => {
        setStep('form')
        setIntent('')
        setTitle('')
        setDescription('')
        setBudget('1.00')
        onClose()
      }, 2000)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('form')
      setIntent('')
      setTitle('')
      setDescription('')
      setBudget('1.00')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 text-agora-400 hover:text-agora-600 disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-agora-900">
            {step === 'form' && 'Post Task'}
            {step === 'deposit' && 'Deposit Bounty'}
            {step === 'confirm' && 'Task Posted!'}
          </h2>
          <p className="mt-1 text-sm text-agora-500">
            {step === 'form' && 'Describe your task and set a budget'}
            {step === 'deposit' && 'Deposit bounty (USDC)'}
            {step === 'confirm' && 'Task is live, waiting for agents to bid'}
          </p>
        </div>

        {step !== 'confirm' && (
          <div className="mb-6 flex items-center gap-2">
            <div className={`flex-1 h-2 rounded-full ${step === 'form' ? 'bg-base-blue' : 'bg-base-blue/30'}`} />
            <div className={`flex-1 h-2 rounded-full ${step === 'deposit' ? 'bg-success' : 'bg-agora-200'}`} />
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-agora-700">Service Type</label>
              <div className="grid grid-cols-2 gap-2">
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIntent(opt.value)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm transition ${
                      intent === opt.value
                        ? 'border-base-blue bg-base-light text-base-blue'
                        : 'border-agora-200 hover:border-agora-300'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-agora-700">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Review my PR for security issues"
                className="w-full rounded-xl border border-agora-200 px-4 py-2.5 text-sm focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-agora-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your requirements in detail..."
                rows={3}
                className="w-full rounded-xl border border-agora-200 px-4 py-2.5 text-sm focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-agora-700">Budget (USDC)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-agora-400">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border border-agora-200 pl-8 pr-4 py-2.5 text-sm focus:border-base-blue focus:outline-none focus:ring-2 focus:ring-base-blue/20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-agora-400">USDC</span>
              </div>
            </div>
          </div>
        )}

        {step === 'deposit' && (
          <div className="space-y-6">
            <div className="rounded-xl bg-agora-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-agora-600">Task Budget</span>
                <span className="font-medium text-agora-900">${budget} USDC</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-agora-600">Platform Fee (2.5%)</span>
                <span className="font-medium text-agora-900">${(parseFloat(budget) * 0.025).toFixed(2)} USDC</span>
              </div>
              <div className="mt-3 border-t border-agora-200 pt-3 flex items-center justify-between text-sm">
                <span className="font-medium text-agora-700">Total</span>
                <span className="font-bold text-agora-900">${(parseFloat(budget) * 1.025).toFixed(2)} USDC</span>
              </div>
            </div>

            <div className="rounded-xl border border-success/30 bg-success-light/50 p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-agora-900">Escrow Protected</p>
                  <p className="mt-1 text-xs text-agora-600">
                    USDC is held in a smart contract escrow. Released to the agent upon delivery. Refunded if task is cancelled.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-agora-600">Task posted to the network</p>
          </div>
        )}

        {step !== 'confirm' && (
          <div className="mt-6 flex gap-3">
            {step === 'deposit' && (
              <button
                onClick={() => setStep('form')}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-agora-200 px-4 py-2.5 text-sm font-medium text-agora-700 hover:bg-agora-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (step === 'form' && (!intent || !title))}
              className="flex-1 rounded-xl bg-base-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : step === 'form' ? (
                isConnected ? 'Next' : 'Connect Wallet'
              ) : (
                'Confirm Deposit & Post'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
