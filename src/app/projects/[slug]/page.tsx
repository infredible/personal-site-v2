import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllProjects } from '@/app/lib/projects'
import Link from 'next/link'
import { siteConfig } from '@/app/config/site'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    const { metadata } = await import(`@/app/content/projects/${slug}.metadata`)
    
    // Make base URL optional for development
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Use custom OG image if provided, otherwise generate one
    const ogImage = metadata.ogImage 
      ? new URL(metadata.ogImage, baseUrl).toString()
      : (() => {
          const ogUrl = new URL('/api/og', baseUrl)
          ogUrl.searchParams.set('title', metadata.title)
          ogUrl.searchParams.set('date', metadata.date)
          return ogUrl.toString()
        })()
    
    return {
      title: metadata.title,
      description: metadata.description,
      openGraph: {
        title: metadata.title,
        description: metadata.description,
        type: 'article',
        publishedTime: metadata.date,
        authors: [siteConfig.name],
        images: [{
          url: ogImage,
          width: 1200,
          height: 630,
          alt: metadata.title,
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: metadata.title,
        description: metadata.description,
        creator: '@fredzaw',
        site: '@fredzaw',
        images: [{
          url: ogImage,
          width: 1200,
          height: 630,
          alt: metadata.title,
        }],
      },
    }
  } catch (error) {
    console.error('Metadata generation error:', error)
    return {}
  }
}

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return projects.map((project) => ({
    slug: project.id,
  }))
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const { metadata } = await import(`@/app/content/projects/${slug}.metadata`)
    const Content = await import(`@/app/content/projects/${slug}.mdx`)

    return (
      <div className="page-content blog-content">
        <div className="back-link">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
        
        <article>
          <div className="prose dark:prose-invert max-w-none">
            <div className="prose time-period">
              {metadata.company && <span>{metadata.company} • </span>}
              {metadata.date}
            </div>
            <h1>{metadata.title}</h1>
            <Content.default />
          </div>
        </article>
      </div>
    )
  } catch {
    notFound()
  }
} 