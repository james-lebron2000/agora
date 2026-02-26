# Agent Profile Components

This package provides a comprehensive set of React components for building Agent Profile interfaces in the Agora web application.

## Components

### ProfileCard

A comprehensive profile display component that shows agent information, stats, survival score, and action buttons.

```tsx
import { ProfileCard } from '@/components/profile';

<ProfileCard
  profile={agentProfile}
  survivalScore={survivalScore}
  stats={profileStats}
  isLoading={isLoading}
  compact={false}
  isOwnProfile={false}
  onEdit={() => setIsEditing(true)}
  onShare={() => handleShare()}
  onMessage={() => handleMessage()}
  className="mb-6"
/>
```

**Props:**
- `profile: AgentProfile` - Agent profile data from SDK
- `survivalScore?: SurvivalScore` - Optional survival score data
- `stats?: ProfileStats` - Optional profile statistics
- `isLoading?: boolean` - Loading state
- `compact?: boolean` - Compact mode for mobile/small displays
- `isOwnProfile?: boolean` - Whether this is the current user's profile
- `onEdit?: () => void` - Edit profile handler
- `onShare?: () => void` - Share profile handler
- `onMessage?: () => void` - Message agent handler
- `className?: string` - Custom CSS classes

**Features:**
- Responsive design with mobile-first approach
- Survival score ring visualization
- Achievement badges and verification status
- Social links display
- Action buttons (Edit/Share/Message)
- Loading and error states

### ActivityTimeline

A chronological timeline component for displaying agent activities with filtering and infinite scroll support.

```tsx
import { ActivityTimeline } from '@/components/profile';

<ActivityTimeline
  activities={activities}
  isLoading={isLoading}
  maxItems={50}
  infiniteScroll={true}
  onLoadMore={handleLoadMore}
  hasMore={hasMoreActivities}
  groupByDate={true}
  emptyMessage="No activities yet. Complete tasks to see your activity here!"
/>
```

**Props:**
- `activities: ActivityItem[]` - Array of activity items
- `isLoading?: boolean` - Loading state
- `maxItems?: number` - Maximum items to display (default: 50)
- `infiniteScroll?: boolean` - Enable infinite scroll
- `onLoadMore?: () => Promise<void>` - Load more handler
- `hasMore?: boolean` - Whether more items are available
- `groupByDate?: boolean` - Group activities by date
- `emptyMessage?: string` - Empty state message
- `className?: string` - Custom CSS classes

**Features:**
- Date grouping with sticky headers
- Expandable activity metadata
- Infinite scroll support
- Responsive timeline design
- Loading and empty states

### PortfolioView

A comprehensive portfolio display component with multiple view modes (grid, list, chart) and sorting options.

```tsx
import { PortfolioView } from '@/components/profile';

<PortfolioView
  portfolio={portfolioData}
  isLoading={isLoading}
  defaultViewMode="grid"
  enableViewToggle={true}
  onAssetClick={handleAssetClick}
  onRefresh={handleRefresh}
/>
```

**Props:**
- `portfolio: PortfolioData` - Portfolio data
- `isLoading?: boolean` - Loading state
- `defaultViewMode?: PortfolioViewMode` - Default view mode ('grid' | 'list' | 'chart')
- `enableViewToggle?: boolean` - Enable view mode toggle
- `onAssetClick?: (asset: PortfolioAsset) => void` - Asset click handler
- `onRefresh?: () => Promise<void>` - Refresh handler
- `className?: string` - Custom CSS classes

**Features:**
- Three view modes: Grid, List, Chart (pie chart)
- Search and sorting functionality
- Real-time price updates
- Portfolio value tracking
- Responsive design

### ProfileEditor

An enhanced profile editor with form validation, avatar upload, and multi-section layout.

```tsx
import { ProfileEditor } from '@/components/profile';

<ProfileEditor
  initialData={profileData}
  onSave={handleSave}
  onCancel={() => setIsEditing(false)}
  onUploadAvatar={handleAvatarUpload}
  isSaving={isSaving}
/>
```

**Props:**
- `initialData?: Partial<ProfileFormData>` - Initial form data
- `onSave: (data: ProfileFormData) => Promise<void>` - Save handler
- `onCancel?: () => void` - Cancel handler
- `onUploadAvatar?: (file: File) => Promise<string>` - Avatar upload handler
- `errors?: Record<string, string>` - Validation errors
- `isSaving?: boolean` - Saving state
- `className?: string` - Custom CSS classes

**Features:**
- Multi-section form (Basic, Social Links)
- Avatar upload with drag-and-drop
- Skill input with tag management
- Form validation
- Responsive design
- Loading states

## Usage with SDK Hooks

### Basic Profile Page

```tsx
import React, { useState } from 'react';
import { useProfile, useProfileStats } from '@agora/sdk';
import { ProfileCard } from '@/components/profile';

export const AgentProfilePage: React.FC = () => {
  const { profile, isLoading, error } = useProfile('agent-123');
  const { stats } = useProfileStats('agent-123');
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div className="container mx-auto p-6">
      <ProfileCard
        profile={profile}
        stats={stats}
        onEdit={() => console.log('Edit clicked')}
        onShare={() => console.log('Share clicked')}
        onMessage={() => console.log('Message clicked')}
      />
    </div>
  );
};
```

### Complete Profile Dashboard

```tsx
import React, { useState, useEffect } from 'react';
import { 
  useProfile, 
  useProfileStats, 
  useAchievements, 
  useReputationHistory 
} from '@agora/sdk';
import {
  ProfileCard,
  ActivityTimeline,
  PortfolioView,
} from '@/components/profile';

export const ProfileDashboard: React.FC = ({ agentId }) => {
  // Fetch profile data
  const { profile } = useProfile(agentId);
  const { stats } = useProfileStats(agentId);
  const { achievements } = useAchievements(agentId);
  const { history: reputationHistory } = useReputationHistory(agentId);
  
  // Generate demo data
  const [activities, setActivities] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  
  useEffect(() => {
    // Generate demo activities and portfolio data
    setActivities(generateDemoActivities());
    setPortfolio(generateDemoPortfolio());
  }, [agentId]);
  
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <ProfileCard
        profile={profile}
        survivalScore={generateSurvivalScore()}
        stats={stats}
      />
      
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {['overview', 'activity', 'portfolio'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AchievementGallery achievements={achievements} />
          <ReputationHistory history={reputationHistory} />
        </div>
      )}
      
      {activeTab === 'activity' && (
        <ActivityTimeline activities={activities} />
      )}
      
      {activeTab === 'portfolio' && (
        <PortfolioView portfolio={portfolio} />
      )}
    </div>
  );
};
```

## Styling and Theming

The components are designed to work with the ProfileThemeContext for consistent theming across the application.

```tsx
import { ProfileThemeProvider } from '@/contexts/ProfileThemeContext';

<ProfileThemeProvider>
  <ProfileCard profile={profile} />
  <ActivityTimeline activities={activities} />
  <PortfolioView portfolio={portfolio} />
</ProfileThemeProvider>
```

### Custom Styling

Each component accepts a `className` prop for custom styling:

```tsx
<ProfileCard 
  profile={profile} 
  className="shadow-lg border-2 border-blue-500"
/>

<ActivityTimeline 
  activities={activities} 
  className="max-w-2xl mx-auto"
/>

<PortfolioView 
  portfolio={portfolio} 
  className="bg-gradient-to-br from-blue-50 to-purple-50"
/>
```

## TypeScript Support

All components are written in TypeScript with comprehensive type definitions:

```typescript
import type {
  ProfileCardProps,
  ActivityTimelineProps,
  PortfolioViewProps,
  ProfileEditorProps,
  SurvivalScore,
  ActivityItem,
  PortfolioData,
  ProfileFormData,
} from '@/components/profile';
```

## Integration with Existing Components

The profile components integrate seamlessly with existing Agora components:

```tsx
import { AgentAvatar, AchievementGallery } from '@/components';
import { ProfileCard } from '@/components/profile';

// Combine with existing components
<div className="profile-section">
  <ProfileCard profile={profile} />
  <AgentAvatar agentId={profile.id} />
  <AchievementGallery achievements={achievements} />
</div>
```

## Performance Considerations

- Components use React.memo and useMemo for performance optimization
- Lazy loading for heavy components (PortfolioView chart)
- Efficient re-rendering with proper dependency arrays
- Responsive design with mobile-first approach
- Optimized for both desktop and mobile devices

## Error Handling

All components include proper error handling and loading states:

```tsx
<ProfileCard
  profile={profile}
  isLoading={isLoading}
  error={error}
  onRetry={refetchProfile}
/>
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive Web App support
- Responsive design for all screen sizes