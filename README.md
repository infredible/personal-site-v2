# Fred Zaw - Personal Portfolio

A modern, responsive personal portfolio and blog built with Next.js, showcasing design work and thoughts from a designer at Uniswap Labs.

## ✨ Features

- **Portfolio Projects**: Showcase of work from Uniswap Labs and TikTok with rich media galleries
- **Blog Posts**: Thoughts on design, development, and industry trends written in MDX
- **Instagram-style Stories**: Interactive video stories showcasing design work and prototypes
- **Weather Integration**: Real-time weather display for Oakland, CA
- **Dark/Light Theme**: System-aware theme toggle with smooth transitions
- **Comparison Sliders**: Before/after image comparisons for design work
- **Responsive Design**: Mobile-first approach with fluid typography and spacing
- **Performance Optimized**: Built with Next.js 15, React 19, and Tailwind CSS 4

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Content**: MDX for blog posts and project pages
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: Custom web fonts (Geist, UntitledSans, Family)
- **Deployment**: Vercel (recommended)

## 🏗 Project Structure

```
src/
├── app/
│   ├── api/markdown/          # API routes for markdown processing
│   ├── config/site.ts         # Site configuration and metadata
│   ├── content/
│   │   ├── posts/            # Blog posts in MDX format
│   │   └── projects/         # Portfolio projects in MDX format
│   ├── lib/                  # Utility functions and data fetching
│   ├── posts/[slug]/         # Dynamic blog post pages
│   ├── projects/[slug]/      # Dynamic project pages
│   └── page.tsx              # Homepage
├── components/               # Reusable UI components
│   ├── BackToTop.tsx        # Scroll to top functionality
│   ├── ComparisonSlider.tsx # Before/after image comparisons
│   ├── Stories.tsx          # Instagram-style video stories
│   ├── theme-toggle.tsx     # Dark/light mode toggle
│   └── page-transition.tsx  # Page transition animations
└── lib/utils.ts             # Utility functions
```

## 🧩 Key Components

This portfolio features several custom, reusable components that create unique interactions:

### Stories Component
**Location**: `src/components/Stories.tsx`

An Instagram-style stories viewer for showcasing design work and prototypes.

**Features**:
- Auto-playing video stories with progress indicators
- Mouse hover to pause, click sides to navigate
- Touch-friendly mobile navigation
- Automatic looping through stories
- Configurable video object-fit (cover/contain)
- Custom padding support for different video formats

**Usage**:
```typescript
<Stories stories={[
  {
    id: 'unique-id',
    title: 'Story Title',
    description: 'Description',
    videoUrl: '/path/to/video.mp4',
    objectFit: 'cover', // or 'contain'
    padding: '52px 0 24px 0' // optional
  }
]} />
```

### ComparisonSlider Component
**Location**: `src/components/ComparisonSlider.tsx`

Interactive before/after image comparison slider, perfect for showcasing design improvements.

**Features**:
- Smooth drag-to-reveal functionality
- Touch and mouse support
- Toggle buttons for full before/after view
- Auto-resets to center position
- Responsive image sizing
- Keyboard accessible

**Usage**:
```typescript
<ComparisonSlider
  beforeImage="/images/before.png"
  afterImage="/images/after.png"
  beforeAlt="Before redesign"
  afterAlt="After redesign"
/>
```

### PageTransition Component
**Location**: `src/components/page-transition.tsx`

Smooth page transitions using Framer Motion with different animations for homepage vs. other pages.

**Features**:
- Fade + slide animations
- Different entrance animations for homepage
- Optimized easing curves
- 300ms duration for immediate feel

### Theme System
**Components**: `ThemeProvider`, `ThemeToggle`
**Location**: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`

System-aware dark/light mode with smooth transitions.

**Features**:
- Respects system preference
- Persistent user choice
- Smooth color transitions
- No flash of unstyled content

### Utility Components
- **BackToTop**: Smooth scroll-to-top with progress indicator
- **CopyLink**: Copy current page URL to clipboard
- **CopyMarkdown**: Copy markdown content with success feedback

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/personal-site-v2.git
cd personal-site-v2
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) to view the site.

### Available Scripts

- **`npm run dev`** - Start development server with Turbopack
- **`npm run build`** - Build for production
- **`npm run start`** - Start production server
- **`npm run lint`** - Run ESLint

## 📝 Content Management

### Adding Blog Posts

1. Create a new `.mdx` file in `src/app/content/posts/`
2. Create a corresponding `.metadata.ts` file with the same name
3. Follow the existing structure for metadata and content

Example metadata file:
```typescript
export const metadata = {
  title: "Your Post Title",
  description: "Brief description of your post",
  date: "2024-01-15"
};
```

### Adding Projects

1. Create a new `.mdx` file in `src/app/content/projects/`
2. Create a corresponding `.metadata.ts` file
3. Add project assets to `public/projects/[project-name]/`

Example project metadata:
```typescript
export const metadata = {
  title: "Project Name",
  description: "Project description",
  company: "Company Name",
  date: "2024",
  url: "https://project-url.com"
};
```

### Adding Stories

Update the `storiesData` array in `src/app/page.tsx` with new video content:

```typescript
{
  id: 'Unique ID',
  title: 'Story Title',
  description: 'Story Description',
  videoUrl: '/path/to/video.mp4',
  objectFit: 'cover' | 'contain'
}
```

## 🎨 Customization

### Site Configuration

Update `src/app/config/site.ts` with your information:

```typescript
export const siteConfig = {
  name: "Your Name",
  title: "Your Name",
  description: "Your description",
  url: "https://yoursite.com",
  links: {
    twitter: "https://twitter.com/username",
    readcv: "https://read.cv/username",
    instagram: "https://instagram.com/username"
  }
}
```

### Fonts

Custom fonts are stored in `public/fonts/`. Update the font imports in `src/app/globals.css` to use your preferred fonts.

### Theme Colors

Modify the CSS custom properties in `src/app/globals.css` to customize the color scheme.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically on every push to main

### Environment Variables

Set up the following environment variables:

```bash
NEXT_PUBLIC_APP_URL=https://yoursite.com
# Add other environment variables as needed
```

### Other Platforms

The site can be deployed on any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔧 Development Notes

- Uses Next.js 15 with App Router
- Implements React 19 features
- Tailwind CSS 4 for styling
- TypeScript for type safety
- MDX for content with syntax highlighting
- Framer Motion for smooth animations
- Weather API integration (update location in `src/app/lib/weather.ts`)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Live Site**: [fredzaw.com](https://fredzaw.com)
- **Twitter**: [@fredzaw](https://twitter.com/fredzaw)
- **Read.cv**: [read.cv/fredzaw](https://read.cv/fredzaw)

---

Built by Fred Zaw aka burmaboy
