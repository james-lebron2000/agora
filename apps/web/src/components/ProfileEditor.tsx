import React, { useState, useCallback } from 'react';
import { useProfileTheme } from '../contexts/ProfileThemeContext';

export interface ProfileData {
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
  social: {
    twitter?: string;
    github?: string;
    website?: string;
  };
}

interface ProfileEditorProps {
  initialData?: Partial<ProfileData>;
  onSave: (data: ProfileData) => void;
  onCancel?: () => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const { themeConfig } = useProfileTheme();
  const [formData, setFormData] = useState<ProfileData>({
    name: initialData?.name || '',
    bio: initialData?.bio || '',
    avatar: initialData?.avatar || '',
    skills: initialData?.skills || [],
    social: initialData?.social || {},
  });
  const [skillInput, setSkillInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback((field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSocialChange = useCallback((platform: keyof ProfileData['social'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      social: { ...prev.social, [platform]: value },
    }));
  }, []);

  const addSkill = useCallback(() => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  }, [skillInput, formData.skills]);

  const removeSkill = useCallback((skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  return (
    <div className={`rounded-xl p-6 ${themeConfig.surface} ${themeConfig.border} border`}>
      <h2 className={`text-xl font-bold mb-4 ${themeConfig.text}`}>Edit Profile</h2>
      
      {/* Avatar */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${themeConfig.textMuted}`}>
          Avatar URL
        </label>
        <input
          type="url"
          value={formData.avatar}
          onChange={(e) => handleChange('avatar', e.target.value)}
          placeholder="https://..."
          className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${themeConfig.textMuted}`}>
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Your Agent name"
          className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {/* Bio */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${themeConfig.textMuted}`}>
          Bio
        </label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Introduce your Agent..."
          rows={3}
          className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
        />
      </div>

      {/* Skills */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${themeConfig.textMuted}`}>
          Skills
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            placeholder="Add skill (press Enter)"
            className={`flex-1 px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            onClick={addSkill}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.skills.map((skill) => (
            <span
              key={skill}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${themeConfig.background} ${themeConfig.text} border ${themeConfig.border}`}
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                className="text-red-400 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${themeConfig.textMuted}`}>
          Social Links
        </label>
        <div className="space-y-2">
          <input
            type="url"
            value={formData.social.twitter || ''}
            onChange={(e) => handleSocialChange('twitter', e.target.value)}
            placeholder="Twitter URL"
            className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <input
            type="url"
            value={formData.social.github || ''}
            onChange={(e) => handleSocialChange('github', e.target.value)}
            placeholder="GitHub URL"
            className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <input
            type="url"
            value={formData.social.website || ''}
            onChange={(e) => handleSocialChange('website', e.target.value)}
            placeholder="Website URL"
            className={`w-full px-3 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.background} ${themeConfig.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg border ${themeConfig.border} ${themeConfig.textMuted} hover:${themeConfig.background} transition-colors`}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!formData.name.trim() || isSaving}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
};

export default ProfileEditor;
