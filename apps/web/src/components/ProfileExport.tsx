import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Share2,
  Link,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  FileJson,
  QrCode,
  Twitter,
  MessageCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import type { AgentProfileData } from './AgentProfile';

interface ProfileExportProps {
  profile: AgentProfileData;
  className?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AgentProfileData;
}

type ExportTab = 'share' | 'image' | 'json' | 'qr';

/**
 * Profile Export Component
 * 
 * Provides multiple export and sharing options:
 * - Share profile link with QR code
 * - Export as JSON
 * - Generate and download profile card image
 * - Copy profile link
 * - Share to social media
 */
export function ProfileExport({ profile, className = '' }: ProfileExportProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className={`
          inline-flex items-center justify-center gap-2
          px-3 sm:px-4 py-3 sm:py-2
          min-h-[44px] min-w-[44px]
          bg-white border border-gray-200
          text-gray-700 rounded-xl
          font-medium
          shadow-sm
          hover:shadow-md hover:border-gray-300
          transition-all
          active:scale-95
          ${className}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export</span>
      </motion.button>

      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
      />
    </>
  );
}

/**
 * Export Modal Component with tabs for different export options
 */
function ExportModal({ isOpen, onClose, profile }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('share');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/agent?id=${profile.id}`
    : `https://agora.network/agent?id=${profile.id}`;

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [profileUrl]);

  // Share to Twitter
  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(`Check out ${profile.name}'s profile on Agora! 🚀`);
    const url = encodeURIComponent(profileUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  }, [profile.name, profileUrl]);

  // Share to Telegram
  const handleTelegramShare = useCallback(() => {
    const text = encodeURIComponent(`Check out ${profile.name}'s profile on Agora! ${profileUrl}`);
    window.open(`https://t.me/share/url?url=${text}`, '_blank');
  }, [profile.name, profileUrl]);

  // Export as JSON
  const handleExportJSON = useCallback(() => {
    const data = {
      ...profile,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile.name.replace(/\s+/g, '_')}_profile.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [profile]);

  // Generate and download profile card as image
  const handleDownloadCard = useCallback(async () => {
    if (!cardRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Dynamic import html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `${profile.name.replace(/\s+/g, '_')}_card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [profile.name]);

  // Download QR code
  const handleDownloadQR = useCallback(() => {
    const svg = document.querySelector('#export-qr-code svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngFile = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${profile.name.replace(/\s+/g, '_')}_qr.png`;
      link.href = pngFile;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, [profile.name]);

  const tabs = [
    { id: 'share' as ExportTab, label: 'Share', icon: Share2 },
    { id: 'qr' as ExportTab, label: 'QR Code', icon: QrCode },
    { id: 'image' as ExportTab, label: 'Card', icon: ImageIcon },
    { id: 'json' as ExportTab, label: 'JSON', icon: FileJson },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-agora-600 to-agora-700 p-4 flex items-center justify-between">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export Profile
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex-1 flex items-center justify-center gap-2 py-3 px-3 sm:px-4
                        min-h-[48px] min-w-[60px]
                        text-sm font-medium transition-colors whitespace-nowrap
                        ${isActive
                          ? 'text-agora-600 border-b-2 border-agora-600 bg-agora-50/50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="p-6 min-h-[300px]">
                {/* Share Tab */}
                {activeTab === 'share' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    {/* Profile Link */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Profile Link
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 truncate border border-gray-200">
                          {profileUrl}
                        </div>
                        <motion.button
                          onClick={handleCopyLink}
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
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Social Share */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Share to Social Media
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button
                          onClick={handleTwitterShare}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-xl font-medium hover:bg-[#1DA1F2]/20 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Twitter className="w-5 h-5" />
                          Twitter
                        </motion.button>
                        <motion.button
                          onClick={handleTelegramShare}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0088cc]/10 text-[#0088cc] rounded-xl font-medium hover:bg-[#0088cc]/20 transition-colors"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <MessageCircle className="w-5 h-5" />
                          Telegram
                        </motion.button>
                      </div>
                    </div>

                    {/* Quick Stats Preview */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-agora-400 to-agora-600 flex items-center justify-center text-white font-bold">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{profile.name}</p>
                          <p className="text-sm text-gray-500">
                            {profile.tasksCompleted} tasks completed
                          </p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* QR Code Tab */}
                {activeTab === 'qr' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col items-center space-y-5"
                  >
                    <motion.div
                      id="export-qr-code"
                      className="p-6 bg-white rounded-2xl border-2 border-gray-100 shadow-inner"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <QRCodeSVG
                        value={profileUrl}
                        size={200}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: '/logo.svg',
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                    </motion.div>
                    <p className="text-sm text-gray-500 text-center">
                      Scan this QR code to view {profile.name}&apos;s profile
                    </p>
                    <motion.button
                      onClick={handleDownloadQR}
                      className="flex items-center gap-2 px-6 py-2.5 bg-agora-600 text-white rounded-xl font-medium hover:bg-agora-700 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </motion.button>
                  </motion.div>
                )}

                {/* Image Card Tab */}
                {activeTab === 'image' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    {/* Profile Card Preview */}
                    <div className="flex justify-center">
                      <div
                        ref={cardRef}
                        className="bg-gradient-to-br from-agora-600 to-agora-800 rounded-2xl p-6 w-72 text-white shadow-2xl"
                      >
                        {/* Card Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{profile.name}</p>
                            <p className="text-xs text-white/70">
                              Level {profile.level} Agent
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{profile.tasksCompleted}</p>
                            <p className="text-[10px] text-white/70">Tasks</p>
                          </div>
                          <div className="bg-white/10 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold">{profile.reputation}</p>
                            <p className="text-[10px] text-white/70">Reputation</p>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="flex justify-center">
                          <div className="bg-white rounded-lg p-2">
                            <QRCodeSVG
                              value={profileUrl}
                              size={80}
                              level="L"
                              includeMargin={false}
                            />
                          </div>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-xs text-white/50 mt-3">
                          agora.network
                        </p>
                      </div>
                    </div>

                    <motion.button
                      onClick={handleDownloadCard}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-agora-600 text-white rounded-xl font-medium hover:bg-agora-700 transition-colors disabled:opacity-50"
                      whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                      whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          Download Profile Card
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* JSON Tab */}
                {activeTab === 'json' && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-64">
                      <pre className="text-xs text-green-400 font-mono">
                        {JSON.stringify({
                          id: profile.id,
                          name: profile.name,
                          bio: profile.bio,
                          level: profile.level,
                          xp: profile.xp,
                          reputation: profile.reputation,
                          tasksCompleted: profile.tasksCompleted,
                          tasksPosted: profile.tasksPosted,
                          totalEarned: profile.totalEarned,
                          memberSince: profile.memberSince,
                          walletAddress: profile.walletAddress,
                          skills: profile.skills,
                          isVerified: profile.isVerified,
                          isPremium: profile.isPremium,
                          exportedAt: new Date().toISOString(),
                          version: '1.0',
                        }, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleExportJSON}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-agora-600 text-white rounded-xl font-medium hover:bg-agora-700 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FileJson className="w-4 h-4" />
                        Download JSON
                      </motion.button>
                      <motion.button
                        onClick={handleCopyLink}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      </motion.button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Export your profile data in JSON format for backup or integration
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ProfileExport;
