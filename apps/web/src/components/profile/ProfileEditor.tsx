/**
 * ProfileEditor Component
 * 
 * Enhanced profile editor with SDK integration, avatar upload,
 * and responsive design.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Upload,
  X,
  Plus,
  Twitter,
  Github,
  Globe,
  Mail,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useProfileTheme } from '../../contexts/ProfileThemeContext';
import type { ProfileFormData, ProfileEditorEnhancedProps } from './types';

// ============================================================================
// Validation Helper
// ============================================================================

const validateProfileData = (data: ProfileFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }

  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }

  // Validate URLs
  const urlRegex = /^https?:\/\/.+/;
  if (data.socials.twitter && !urlRegex.test(data.socials.twitter)) {
    errors.twitter = 'Must be a valid URL';
  }
  if (data.socials.github && !urlRegex.test(data.socials.github)) {
    errors.github = 'Must be a valid URL';
  }
  if (data.socials.website && !urlRegex.test(data.socials.website)) {
    errors.website = 'Must be a valid URL';
  }
  if (data.socials.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.socials.email)) {
    errors.email = 'Must be a valid email';
  }

  return errors;
};

// ============================================================================
// Avatar Upload Component
// ============================================================================

interface AvatarUploadProps {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
  isUploading?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onUpload,
  onRemove,
  isUploading = false,
}) => {
  const { themeConfig } = useProfileTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
        await onUpload(file);
      }
    }
  }, [onUpload]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPreviewUrl(URL.createObjectURL(file));
      await onUpload(file);
    }
  }, [onUpload]);

  const displayUrl = previewUrl || currentAvatar;

  return (
    <div className="flex flex-col items-center">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative w-28 h-28 rounded-full overflow-hidden cursor-pointer
          border-2 border-dashed transition-all
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : `${themeConfig.border} ${themeConfig.background} hover:border-blue-400`
          }
        `}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
            <div className={`
              absolute inset-0 bg-black/50 flex items-center justify-center
              opacity-0 hover:opacity-100 transition-opacity
            `}>
              <ImageIcon size={24} className="text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {isUploading ? (
              <Loader2 size={24} className={`animate-spin ${themeConfig.textMuted}`} />
            ) : (
              <>
                <Upload size={20} className={themeConfig.textMuted} />
                <span className={`text-xs mt-1 ${themeConfig.textMuted}`}>Upload</span>
              </>
            )}
          </div>
        )}

        {/* Remove button */}
        {displayUrl && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              setPreviewUrl(null);
            }}
            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className={`mt-2 text-xs ${themeConfig.textMuted}`}>
        Click or drag to upload
      </p>
    </div>
  );
};

// ============================================================================
// Skill Input Component
// ============================================================================

interface SkillInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
}

const SkillInput: React.FC<SkillInputProps> = ({
  skills,
  onChange,
  maxSkills = 10,
}) => {
  const { themeConfig } = useProfileTheme();
  const [input, setInput] = useState('');

  const addSkill = useCallback(() => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !skills.includes(trimmed) && skills.length < maxSkills) {
      onChange([...skills, trimmed]);
      setInput('');
    }
  }, [input, skills, onChange, maxSkills]);

  const removeSkill = useCallback((skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  }, [skills, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    } else if (e.key === 'Backspace' && !input && skills.length > 0) {
      removeSkill(skills[skills.length - 1]);
    }
  }, [input, skills, addSkill, removeSkill]);

  return (
    <div>
      <div className={`
        flex flex-wrap items-center gap-2 p-2 rounded-lg
        ${themeConfig.background} ${themeConfig.border} border
        focus-within:ring-2 focus-within:ring-blue-500
      `}>
        {skills.map((skill) => (
          <span
            key={skill}
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm
              ${themeConfig.surface} ${themeConfig.text}
              border ${themeConfig.border}
            `}
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}
        
        {skills.length < maxSkills && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addSkill}
            placeholder={skills.length === 0 ? 'Add skills...' : ''}
            className={`
              flex-1 min-w-[100px] bg-transparent outline-none text-sm
              ${themeConfig.text}
            `}
          />
        )}
      </div>
      
      <div className="flex justify-between mt-1">
        <span className={`text-xs ${themeConfig.textMuted}`}>
          Press Enter to add
        </span>
        <span className={`text-xs ${themeConfig.textMuted}`}>
          {skills.length}/{maxSkills}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Profile Editor Component
// ============================================================================

export const ProfileEditor: React.FC<ProfileEditorEnhancedProps> = ({
  initialData,
  onSave,
  onCancel,
  onUploadAvatar,
  errors: externalErrors,
  isSaving = false,
  className = '',
}) => {
  const { themeConfig } = useProfileTheme();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    name: initialData?.name || '',
    bio: initialData?.bio || '',
    avatar: initialData?.avatar || '',
    skills: initialData?.skills || [],
    socials: initialData?.socials || {},
    preferences: initialData?.preferences || {
      theme: 'system',
      notifications: true,
      publicProfile: true,
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Merge external and validation errors
  const errors = { ...validationErrors, ...externalErrors };

  // Handle field change
  const handleChange = useCallback(<K extends keyof ProfileFormData>(
    field: K,
    value: ProfileFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [validationErrors]);

  // Handle social change
  const handleSocialChange = useCallback((platform: keyof ProfileFormData['socials'], value: string) => {
    handleChange('socials', { ...formData.socials, [platform]: value });
  }, [formData.socials, handleChange]);

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!onUploadAvatar) {
      // Fallback: use object URL for preview
      handleChange('avatar', URL.createObjectURL(file));
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUploadAvatar(file);
      handleChange('avatar', url);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadAvatar, handleChange]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validation = validateProfileData(formData);
    setValidationErrors(validation);
    setTouched({
      name: true,
      bio: true,
      avatar: true,
      skills: true,
      socials: true,
    });

    if (Object.keys(validation).length > 0) {
      return;
    }

    await onSave(formData);
  }, [formData, onSave]);

  // Form sections
  const sections = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: <User size={18} />,
      content: (
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <AvatarUpload
              currentAvatar={typeof formData.avatar === 'string' ? formData.avatar : undefined}
              onUpload={handleAvatarUpload}
              onRemove={() => handleChange('avatar', '')}
              isUploading={isUploading}
            />
          </div>

          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              placeholder="Your agent name"
              className={`
                w-full px-4 py-2.5 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.name && touched.name ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            <AnimatePresence>
              {errors.name && touched.name && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-1 text-sm text-red-500 flex items-center gap-1"
                >
                  <AlertCircle size={14} />
                  {errors.name}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Bio */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, bio: true }))}
              placeholder="Tell us about your agent..."
              rows={4}
              maxLength={500}
              className={`
                w-full px-4 py-2.5 rounded-lg resize-none
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.bio && touched.bio ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            <div className="flex justify-between mt-1">
              <AnimatePresence>
                {errors.bio && touched.bio && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-red-500 flex items-center gap-1"
                  >
                    <AlertCircle size={14} />
                    {errors.bio}
                  </motion.p>
                )}
              </AnimatePresence>
              <span className={`text-xs ${themeConfig.textMuted} ml-auto`}>
                {formData.bio.length}/500
              </span>
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              Skills
            </label>
            <SkillInput
              skills={formData.skills}
              onChange={(skills) => handleChange('skills', skills)}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'socials',
      title: 'Social Links',
      icon: <Globe size={18} />,
      content: (
        <div className="space-y-4">
          {/* Twitter */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              <span className="flex items-center gap-2">
                <Twitter size={14} className="text-blue-400" />
                Twitter
              </span>
            </label>
            <input
              type="url"
              value={formData.socials.twitter || ''}
              onChange={(e) => handleSocialChange('twitter', e.target.value)}
              placeholder="https://twitter.com/username"
              className={`
                w-full px-4 py-2.5 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.twitter ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            {errors.twitter && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.twitter}
              </p>
            )}
          </div>

          {/* GitHub */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              <span className="flex items-center gap-2">
                <Github size={14} />
                GitHub
              </span>
            </label>
            <input
              type="url"
              value={formData.socials.github || ''}
              onChange={(e) => handleSocialChange('github', e.target.value)}
              placeholder="https://github.com/username"
              className={`
                w-full px-4 py-2.5 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.github ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            {errors.github && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.github}
              </p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              <span className="flex items-center gap-2">
                <Globe size={14} />
                Website
              </span>
            </label>
            <input
              type="url"
              value={formData.socials.website || ''}
              onChange={(e) => handleSocialChange('website', e.target.value)}
              placeholder="https://your-website.com"
              className={`
                w-full px-4 py-2.5 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.website ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.website}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${themeConfig.text}`}>
              <span className="flex items-center gap-2">
                <Mail size={14} />
                Contact Email
              </span>
            </label>
            <input
              type="email"
              value={formData.socials.email || ''}
              onChange={(e) => handleSocialChange('email', e.target.value)}
              placeholder="contact@example.com"
              className={`
                w-full px-4 py-2.5 rounded-lg
                ${themeConfig.background} ${themeConfig.text}
                ${themeConfig.border} border
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.email ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState('basic');

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className={`
        rounded-2xl overflow-hidden
        ${themeConfig.surface}
        ${themeConfig.border} border
        ${themeConfig.shadowStyle}
      `}>
        {/* Header */}
        <div className={`p-6 border-b ${themeConfig.border}`}>
          <h2 className={`text-xl font-bold ${themeConfig.text}`}>Edit Profile</h2>
          <p className={`mt-1 text-sm ${themeConfig.textMuted}`}>
            Customize your agent profile and public information
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b ${themeConfig.border} overflow-x-auto`}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${activeSection === section.id
                  ? `border-blue-500 text-blue-500`
                  : `border-transparent ${themeConfig.textMuted} hover:${themeConfig.text}`
                }
              `}
            >
              {section.icon}
              {section.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {sections.map((section) => (
              activeSection === section.id && (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {section.content}
                </motion.div>
              )
            ))}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${themeConfig.border} flex justify-end gap-3`}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className={`
                px-6 py-2.5 rounded-lg font-medium
                ${themeConfig.surface} ${themeConfig.border} border
                ${themeConfig.text}
                hover:opacity-80
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className={`
              flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
              bg-gradient-to-r ${themeConfig.gradientPrimary}
              text-white
              hover:opacity-90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            `}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProfileEditor;
