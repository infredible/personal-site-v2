import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight,ArrowRight } from "lucide-react";
import { getAllProjects } from "@/app/lib/projects";
import { getAllPosts, formatDate } from "@/app/lib/posts";
import { getWeather, formatTemperature } from "@/app/lib/weather";
import { PageTransition, Stories } from "@/components";
import { Metadata } from "next";
import { siteConfig } from "@/app/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  // Generate OG image for homepage
  const ogUrl = new URL('/api/og', baseUrl)
  ogUrl.searchParams.set('title', siteConfig.name)
  ogUrl.searchParams.set('subtitle', 'Designer at Uniswap Labs')
  const ogImage = ogUrl.toString()
  
  return {
    title: siteConfig.name,
    description: siteConfig.description,
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
    <PageTransition>
      <div className="max-w-xl mx-auto px-6 py-24">
        <header className="mb-10 mt-14">
          <h1 className="text-3xl font-medium mb-1 font-serif">Fred Zaw</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground mb-6">Oakland, CA</p>
            <p className="text-muted-foreground mb-6">•</p>
            <p className="text-muted-foreground mb-6">{weatherDisplay}</p>
          </div>
          
          <p className="text-base">
            Designer at Uniswap Labs unlocking a more free and open financial system. 
            Before crypto, worked on a breadth of industries including AI and spatial computing.
          </p>
          <nav className="mt-2">
            <Link href="/about" className="text-sm text-muted-foreground flex items-center gap-1 group">
              More
              <ArrowRight className="w-3 h-3 transition-transform translate-x-[-5px] opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          </nav>
        </header>

        {/* Placeholder for screenshot - commented out until we have the image */}
        {/* <div className="mt-12 mb-16">
          <img
            src="/images/uniswap-screenshot.png"
            alt="Uniswap dashboard screenshot"
            className="rounded-lg w-full"
          />
        </div> */}

        {/* Stories Section */}
        <Stories stories={storiesData} />

        <section className="mb-24">
          <h2 className="text-2xl font-medium font-serif mb-10">Projects</h2>
          
          <div className="space-y-12">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/projects/${project.id}`}
                className="block group hover:opacity-70 transition-opacity"
              >
                <div>
                  <h3 className="text-md font-medium mb-1">
                    {project.metadata.title}
                  </h3>
                  <p>{project.metadata.description}</p>
                  <div className="flex items-center mt-2">
                    <Image 
                      src={project.metadata.company === 'Uniswap Labs' ? "/icons/uniswap.png" : "/icons/tiktok.png"} 
                      alt={project.metadata.company} 
                      width={16}
                      height={16}
                      className="w-4 h-4 mr-2 rounded-full"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-sm">{project.metadata.company}</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">{project.metadata.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <h2 className="text-2xl font-medium font-serif mb-10">Thoughts</h2>
          
          <div className="space-y-8">
            {posts.map((post) => (
              <Link 
                key={post.id}
                href={`/posts/${post.id}`}
                className="block group hover:opacity-70 transition-opacity"
              >
                <div>
                  <h3 className="text-md font-medium mb-1">
                    {post.metadata.title}
                  </h3>
                  <p>{post.metadata.description}</p>
                  <div className="text-muted-foreground text-sm mt-2 flex items-center gap-2">
                    <span>{formatDate(post.metadata.date)}</span>
                    {post.metadata.tags?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{post.metadata.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-24">
        {/* <footer className="pt-14 border-t"> */}
          <h2 className="text-2xl font-medium font-serif mb-10">Elsewhere</h2>
          <div className="flex space-x-6">
            <Link href="https://x.com/fredzaw" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group">
              Twitter
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://read.cv/fredzaw" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group">
              Read.cv
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://www.instagram.com/_burmaboy/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group">
              Instagram
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <Link href="https://app.ens.domains/swappypapi.eth" target="_blank" rel="noopener noreferrer" className="text-muted-foreground flex items-center gap-1 group">
              Swappypapi.eth
              <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        {/* </footer> */}
        </section>
      </div>
    </PageTransition>
  );
}
