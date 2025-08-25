import { Metadata } from 'next';
import { siteConfig } from '@/app/config/site';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Generate OG image for playground page
  const ogUrl = new URL('/api/og', baseUrl)
  ogUrl.searchParams.set('title', 'Playground')
  ogUrl.searchParams.set('subtitle', 'Design Engineering Prototypes')
  const ogImage = ogUrl.toString()
  
  return {
    title: 'Playground',
    description: 'A collection of design engineering prototypes and interactive experiments by Fred Zaw.',
    openGraph: {
      title: 'Playground',
      description: 'A collection of design engineering prototypes and interactive experiments by Fred Zaw.',
      type: 'website',
      url: `${siteConfig.url}/playground`,
      siteName: siteConfig.name,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Playground - Design Engineering Prototypes',
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Playground',
      description: 'A collection of design engineering prototypes and interactive experiments by Fred Zaw.',
      creator: '@fredzaw',
      site: '@fredzaw',
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Playground - Design Engineering Prototypes',
      }],
    },
  }
}

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
