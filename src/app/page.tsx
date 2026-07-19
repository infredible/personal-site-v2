import { getAllProjects } from "@/app/lib/projects";
import { getAllPosts } from "@/app/lib/posts";
import { getWeather, formatTemperature } from "@/app/lib/weather";
import { Metadata } from "next";
import { siteConfig } from "@/app/config/site";
import { HomeContent } from "@/components";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Generate OG image for homepage
  const ogUrl = new URL('/api/og', baseUrl)
  ogUrl.searchParams.set('title', siteConfig.name)
  ogUrl.searchParams.set('subtitle', 'Designer at Clay')
  const ogImage = ogUrl.toString()
  
  return {
    title: siteConfig.title,
    description: siteConfig.description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: siteConfig.name,
      description: siteConfig.description,
      type: 'website',
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteConfig.name,
      description: siteConfig.description,
      creator: '@fredzaw',
      site: '@fredzaw',
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      }],
    },
  }
}

export default async function Home() {
  const projects = await getAllProjects();
  const posts = await getAllPosts();
  
  // Fetch weather data, with fallback for errors
  let weatherDisplay = "70°F"; // Fallback temperature
  try {
    const weather = await getWeather();
    weatherDisplay = formatTemperature(weather.current.temperature_2m);
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    // Keep the fallback value
  }

  // Stories data
  const storiesData = [
    { 
      id: 'Drag to Swap', 
      title: 'Drag to Swap', 
      description: 'Drag to Swap', 
      videoUrl: '/projects/swap/drag-to-swap.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'Token Pad', 
      title: 'Token Pad', 
      description: 'Token Pad', 
      videoUrl: '/projects/swap/token-pad.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'Mobile Navigation', 
      title: 'Mobile Navigation', 
      description: 'Mobile Navigation', 
      videoUrl: '/projects/swap/mobile-navigation.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'Permit2', 
      title: 'Permit2', 
      description: 'Permit2', 
      videoUrl: '/projects/swap/Permit2.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'Mini Charts', 
      title: 'Mini Charts', 
      description: 'Mini Charts', 
      videoUrl: '/projects/misc/mini-chart.mp4',
      objectFit: 'contain' as const,
      padding: '52px 0 24px 0',
    },
    { 
      id: 'Trade Type Switcher', 
      title: 'Trade Type Switcher', 
      description: 'Trade Type Switcher', 
      videoUrl: '/projects/swap/trade-type-switcher.mp4',
      objectFit: 'cover' as const,
    },
    { 
      id: 'Cortex Install', 
      title: 'Cortex Install', 
      description: 'Cortex Install', 
      videoUrl: '/projects/misc/cortex-install.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'TTEH Demo', 
      title: 'TTEH Demo', 
      description: 'TTEH Demo', 
      videoUrl: '/projects/tiktok/demo.mp4',
      objectFit: 'cover' as const
    },
    { 
      id: 'MP Tilt', 
      title: 'MP Tilt', 
      description: 'MP Tilt', 
      videoUrl: '/projects/misc/mp-tilt.mp4',
      objectFit: 'contain' as const
    },
    { 
      id: 'Pan Guidance', 
      title: 'Pan Guidance', 
      description: 'Pan Guidance', 
      videoUrl: '/projects/misc/pan-guidance.mp4',
      objectFit: 'contain' as const
    },
    { 
      id: 'MP Scan', 
      title: 'MP Scan', 
      description: 'MP Scan', 
      videoUrl: '/projects/misc/mp-scan.mp4',
      objectFit: 'contain' as const
    },
    { 
      id: 'AR Guidance', 
      title: 'AR Guidance', 
      description: 'AR Guidance', 
      videoUrl: '/projects/misc/ar-guidance.mp4',
      objectFit: 'contain' as const
    },
    { 
      id: 'Waypoints', 
      title: 'Waypoints', 
      description: 'Waypoints', 
      videoUrl: '/projects/misc/waypoints.mp4',
      objectFit: 'contain' as const
    },
    { 
      id: 'Ebay Passions', 
      title: 'Ebay Passions', 
      description: 'Ebay Passions', 
      videoUrl: '/projects/misc/ebay-passions.mp4',
      objectFit: 'cover' as const
    },
  ];

  return (
    <HomeContent 
      projects={projects}
      posts={posts}
      weatherDisplay={weatherDisplay}
      storiesData={storiesData}
    />
  );
}
