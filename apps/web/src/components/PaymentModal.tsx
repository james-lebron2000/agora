import { useEffect, useMemo, useState } from 'react'
import { isAddress, parseEther, parseUnits } from 'viem'
import { useBalance, useWriteContract } from 'wagmi'
import { useWallet, truncateAddress, USDC_ABI } from '../hooks/useWallet'
import { BASE_NETWORK, PREFERRED_CHAIN, getChainLabel, getExplorerBaseUrl, resolveUsdcAddress } from '../lib/chain'
import { ESCROW_ABI, encodeRequestId, getEscrowAddress } from '../lib/escrow'

type PaymentToken = 'USDC' | 'ETH'

export interface PaymentReceipt {
  txHash: string
  token: PaymentToken
  amount: string
  chain: 'base' | 'base-sepolia'
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (receipt: PaymentReceipt) => void
  offer: {
    offerId: string
    provider: string
    priceAmount?: number
    currency?: string
    priceUsd?: number
  } | null
  thread: {
    requestId: string
    intent?: string
  } | null
}

type PaymentStep = 'confirm' | 'switch-chain' | 'processing' | 'success' | 'error'

export function PaymentModal({ isOpen, onClose, onConfirm, offer, thread }: PaymentModalProps) {
  const { address, isConnected, isBaseChain, switchToBaseChain, balance, connect, chainId } = useWallet()
  const { writeContractAsync } = useWriteContract()
  const [step, setStep] = useState<PaymentStep>('confirm')
  const [selectedToken, setSelectedToken] = useState<PaymentToken>('USDC')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  if (!isOpen || !offer || !thread) return null

  const activeChainId = chainId ?? PREFERRED_CHAIN.id
  const offerToken: PaymentToken = (offer.currency || 'USDC').toUpperCase() === 'ETH' ? 'ETH' : 'USDC'
  const tokenLocked = Boolean(offer.currency)
  const defaultToken = offerToken
  const isSelectedTokenAllowed = !tokenLocked || selectedToken === offerToken
  const amount = isSelectedTokenAllowed ? (offer.priceAmount ?? offer.priceUsd ?? 0) : 0
  const amountString = amount.toString()
  const escrowAddress = getEscrowAddress()
  const hasEnoughUsdcFromWallet = balance && parseFloat(balance) >= amount
  const chainLabel = getChainLabel(chainId ?? undefined)
  const explorerBaseUrl = getExplorerBaseUrl(chainId ?? undefined)
  const usdcAddress = resolveUsdcAddress(chainId ?? undefined)
  const paymentChain: 'base' | 'base-sepolia' = chainId === 8453
    ? 'base'
    : chainId === 84532
      ? 'base-sepolia'
      : BASE_NETWORK
  const { data: usdcBalanceData } = useBalance({
    address: address ? (address as `0x${string}`) : undefined,
    token: usdcAddress,
    chainId: activeChainId,
    query: {
      enabled: Boolean(address),
    },
  })
  const { data: ethBalanceData } = useBalance({
    address: address ? (address as `0x${string}`) : undefined,
    chainId: activeChainId,
    query: {
      enabled: Boolean(address),
    },
  })
  const selectedBalance = useMemo(() => {
    if (selectedToken === 'USDC') {
      if (!usdcBalanceData && hasEnoughUsdcFromWallet != null) return balance
      return usdcBalanceData?.formatted ?? null
    }
    return ethBalanceData?.formatted ?? null
  }, [balance, ethBalanceData, hasEnoughUsdcFromWallet, selectedToken, usdcBalanceData])
  const hasEnoughBalance = selectedBalance ? Number(selectedBalance) >= amount : false

  useEffect(() => {
    if (!isOpen) return
    setSelectedToken(defaultToken)
  }, [defaultToken, isOpen])

  const handlePay = async () => {
    if (!isConnected) {
      await connect()
      return
    }

    if (!isBaseChain) {
      setStep('switch-chain')
      return
    }

    setStep('processing')
    setError(null)

    try {
      if (amount <= 0) throw new Error('Offer amount must be greater than zero')
      if (!isAddress(offer.provider)) {
        throw new Error('Seller address is not a valid EVM address')
      }

      if (selectedToken === 'USDC') {
        if (!escrowAddress) {
          throw new Error('Escrow contract not configured')
        }

        const amountUnits = parseUnits(amountString, 6)
        await writeContractAsync({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [escrowAddress, amountUnits],
        })

        const depositTx = await writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'deposit',
          args: [encodeRequestId(thread.requestId), offer.provider, amountUnits],
        })
        setTxHash(depositTx)
      } else {
        if (!escrowAddress) {
          throw new Error('Escrow contract not configured')
        }
        const ethTx = await writeContractAsync({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'depositETH',
          args: [encodeRequestId(thread.requestId), offer.provider],
          value: parseEther(amountString),
        } as any)
        setTxHash(ethTx)
      }

      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Payment failed')
      setStep('error')
    }
  }

  const handleSwitchChain = async () => {
    const success = await switchToBaseChain()
    if (success) {
      setStep('confirm')
    }
  }

  const handleSuccessClose = () => {
    if (txHash) {
      onConfirm({
        txHash,
        token: selectedToken,
        amount: amountString,
        chain: paymentChain,
      })
    }
    setStep('confirm')
    setTxHash(null)
    setError(null)
    onClose()
  }

  const handleRetry = () => {
    setStep('confirm')
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-agora-950/60 backdrop-blur-sm" onClick={step !== 'processing' ? onClose : undefined} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-agora-900 to-agora-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pay with {selectedToken}
          </h3>
          <p className="text-white/75 text-sm mt-1">{chainLabel}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'confirm' && (
            <>
              {/* Transaction Summary */}
              <div className="mb-4">
                <p className="text-agora-500 text-sm mb-2">Payment Token</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedToken('USDC')}
                    disabled={tokenLocked && offerToken !== 'USDC'}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedToken === 'USDC'
                        ? 'border-agora-900 bg-agora-900 text-white'
                        : 'border-agora-200 text-agora-700 hover:bg-agora-50'
                    }`}
                  >
                    USDC
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedToken('ETH')}
                    disabled={tokenLocked && offerToken !== 'ETH'}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedToken === 'ETH'
                        ? 'border-agora-900 bg-agora-900 text-white'
                        : 'border-agora-200 text-agora-700 hover:bg-agora-50'
                    }`}
                  >
                    ETH
                  </button>
                </div>
                {tokenLocked ? (
                  <div className="mt-2 text-xs text-agora-500">
                    This offer is priced in {offerToken}. Dual-currency support means you can accept offers priced in USDC or ETH.
                  </div>
                ) : null}
              </div>

              <div className="bg-agora-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-agora-500 text-sm">Service</span>
                  <span className="text-agora-900 font-medium">{thread.intent || 'Unknown'}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-agora-500 text-sm">Provider</span>
                  <span className="text-agora-900 font-medium font-mono text-xs">{truncateAddress(offer.provider, 6)}</span>
                </div>
                <div className="border-t border-agora-200 my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-agora-600 font-medium">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-agora-900">
                      {selectedToken === 'USDC' ? `$${amount.toFixed(4)}` : amount.toFixed(6)}
                    </span>
                    <span className="bg-agora-100 text-agora-700 text-xs font-semibold px-2 py-1 rounded-full">{selectedToken}</span>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              {isConnected ? (
                <div className="mb-6 p-3 bg-agora-50 rounded-lg border border-agora-200">
                  <div className="flex justify-between items-center">
                    <span className="text-agora-600 text-sm">Connected</span>
                    <span className="text-agora-900 font-mono text-sm">{truncateAddress(address!, 4)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-agora-600 text-sm">{selectedToken} Balance</span>
                    <span className={`font-medium ${hasEnoughBalance ? 'text-success' : 'text-red-500'}`}>
                      {selectedBalance
                        ? selectedToken === 'USDC'
                          ? `$${Number(selectedBalance).toFixed(2)}`
                          : `${Number(selectedBalance).toFixed(6)} ETH`
                        : 'Loading...'}
                    </span>
                  </div>
                  {!isBaseChain && (
                    <div className="mt-2 text-xs text-warning bg-warning-light px-2 py-1 rounded">
                      Switch to Base network to continue
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-4 bg-agora-100 rounded-lg text-center">
                  <p className="text-agora-600 text-sm mb-3">Connect your wallet to pay</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-agora-200 text-agora-700 font-medium hover:bg-agora-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={isConnected && (!isBaseChain || amount <= 0 || !isSelectedTokenAllowed)}
                  className="flex-1 px-4 py-3 rounded-xl bg-agora-900 text-white font-semibold hover:bg-agora-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-agora-900/25"
                >
                  {isConnected ? `Pay ${selectedToken}` : 'Connect Wallet'}
                </button>
              </div>

              {!isSelectedTokenAllowed ? (
                <p className="text-center text-xs text-warning mt-3">
                  This offer is priced in {offerToken}. Switch token to continue.
                </p>
              ) : null}

              {isConnected && !isBaseChain && (
                <p className="text-center text-xs text-agora-500 mt-3">
                  Please switch to {chainLabel} to continue
                </p>
              )}
            </>
          )}

          {step === 'switch-chain' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-agora-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-agora-900 mb-2">Switch Network</h4>
              <p className="text-agora-500 mb-6">Please switch to {chainLabel} to complete this payment.</p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-agora-200 text-agora-700 font-medium hover:bg-agora-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSwitchChain}
                  className="flex-1 px-4 py-3 rounded-xl bg-agora-900 text-white font-semibold hover:bg-agora-800 transition-all shadow-lg shadow-agora-900/25"
                >
                  Switch to {chainLabel}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-agora-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-agora-900 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-agora-900 mb-2">Processing Payment</h4>
              <p className="text-agora-500">Please confirm the transaction in your wallet...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-agora-900 mb-2">Payment Successful!</h4>
              <p className="text-agora-500 mb-4">Your {selectedToken} transaction has been confirmed.</p>

              {txHash && (
                <div className="bg-agora-50 rounded-lg p-3 mb-6">
                  <div className="text-xs text-agora-500 mb-1">Transaction Hash</div>
                  <a
                    href={`${explorerBaseUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-agora-900 hover:underline break-all"
                  >
                    {txHash}
                  </a>
                </div>
              )}

              <button
                onClick={handleSuccessClose}
                className="w-full px-4 py-3 rounded-xl bg-success text-white font-semibold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25"
              >
                Confirm Offer Acceptance
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-agora-900 mb-2">Payment Failed</h4>
              <p className="text-agora-500 mb-4">{error || 'Something went wrong'}</p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-agora-200 text-agora-700 font-medium hover:bg-agora-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-3 rounded-xl bg-agora-900 text-white font-semibold hover:bg-agora-800 transition-all shadow-lg shadow-agora-900/25"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-agora-50 px-6 py-3 flex items-center justify-center gap-2 text-xs text-agora-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secured by {chainLabel}
        </div>
      </div>
    </div>
  )
}
