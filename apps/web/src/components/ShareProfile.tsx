import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Share2,
  Link,
  Twitter,
  MessageCircle,
  Copy,
  Check,
  X,
  Download,
} from 'lucide-react';

interface ShareProfileProps {
  agentId: string;
  agentName: string;
  className?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
}

/**
 * Share Profile Button Component
 * 
 * Opens a modal with sharing options including:
 * - QR code generation
 * - Copy link
 * - Share to social media
 * - Download QR code
 */
export function ShareProfile({ agentId, agentName, className = '' }: ShareProfileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className={`
          inline-flex items-center justify-center gap-2
          px-4 py-3 sm:py-2
          min-h-[44px]
          bg-gradient-to-r from-agora-600 to-agora-700
          text-white rounded-xl
          font-medium
          shadow-md
          hover:shadow-lg
          transition-shadow
          active:scale-95
          ${className}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">Share Profile</span>
        <span className="sm:hidden">Share</span>
      </motion.button>

      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentId={agentId}
        agentName={agentName}
      />
    </>
  );
}

/**
 * Share Modal Component
 */
function ShareModal({ isOpen, onClose, agentId, agentName }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate profile URL
  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/agent?id=${agentId}`
    : `https://agora.network/agent?id=${agentId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Check out ${agentName} on Agora!`);
    const url = encodeURIComponent(profileUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleTelegramShare = () => {
    const text = encodeURIComponent(`Check out ${agentName} on Agora! ${profileUrl}`);
    window.open(`https://t.me/share/url?url=${text}`, '_blank');
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#agent-qr-code svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${agentName}-qr-code.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-agora-600 to-agora-700 p-4 flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Profile
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <motion.div
                    id="agent-qr-code"
                    className="p-4 bg-white rounded-xl border-2 border-agora-100 shadow-inner"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <QRCodeSVG
                      value={profileUrl}
                      size={180}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: '/logo.svg',
                        height: 30,
                        width: 30,
                        excavate: true,
                      }}
                    />
                  </motion.div>
                  <p className="text-sm text-agora-500 mt-3 text-center">
                    Scan to view {agentName}&apos;s profile
                  </p>
                </div>

                {/* Link section */}
                <div>
                  <label className="text-sm font-medium text-agora-700 mb-1.5 block">
                    Profile Link
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-agora-50 rounded-xl px-3 py-2.5 text-sm text-agora-600 truncate border border-agora-200">
                      {profileUrl}
                    </div>
                    <motion.button
                      onClick={handleCopy}
                      className={`
                        px-4 py-2 rounded-xl font-medium flex items-center gap-2
                        transition-colors
                        ${copied 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-agora-100 text-agora-700 hover:bg-agora-200'
                        }
                      `}
                      whileTap={{ scale: 0.95 }}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="hidden sm:inline">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">Copy</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Social share buttons */}
                <div>
                  <label className="text-sm font-medium text-agora-700 mb-2 block">
                    Share to
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      onClick={handleTwitterShare}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-xl font-medium hover:bg-[#1DA1F2]/20 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </motion.button>
                    <motion.button
                      onClick={handleTelegramShare}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0088cc]/10 text-[#0088cc] rounded-xl font-medium hover:bg-[#0088cc]/20 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Telegram
                    </motion.button>
                  </div>
                </div>

                {/* Download QR */}
                <motion.button
                  onClick={handleDownloadQR}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-agora-200 text-agora-700 rounded-xl font-medium hover:bg-agora-50 transition-colors"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ShareProfile;
