# Agora Marketing Website

A modern, responsive marketing website for Agora - a decentralized Agent-to-Agent economy platform.

## Features

- **Hero Section**: Animated gradient background with floating orbs and call-to-action
- **Features Grid**: Showcases A2A protocol, escrow, staking, and more
- **Tokenomics Section**: Interactive charts showing token distribution and vesting schedule
- **Roadmap Timeline**: Visual timeline of project phases
- **Team Section**: Team members with GitHub/social links
- **CTA Sections**: Dedicated sections for developers and investors
- **SEO Optimized**: Meta tags, Open Graph, and structured data
- **Mobile First**: Fully responsive design

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

The static files will be generated in the `dist` folder.

## Project Structure

```
src/
├── app/
│   ├── globals.css    # Global styles and Tailwind config
│   ├── layout.tsx     # Root layout with metadata
│   └── page.tsx       # Main page composition
├── components/
│   ├── Navigation.tsx # Fixed navigation bar
│   ├── Hero.tsx       # Hero section with animations
│   ├── Features.tsx   # Features grid
│   ├── Tokenomics.tsx # Token distribution charts
│   ├── Roadmap.tsx    # Timeline component
│   ├── Team.tsx       # Team section
│   ├── CTA.tsx        # Developer & Investor CTAs
│   └── Footer.tsx     # Footer with links
└── lib/
    └── utils.ts       # Utility functions
```

## SEO

The site includes comprehensive SEO features:
- Title and meta description
- Open Graph tags for social sharing
- Twitter Card support
- Semantic HTML structure
- Fast loading with static generation

## Deployment

This project is configured for static export and can be deployed to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting

## License

MIT
