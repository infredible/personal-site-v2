import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllProjects, Project } from '@/app/lib/projects'
import Link from 'next/link'
import { siteConfig } from '@/app/config/site'
import { PageTransition, BackToTop, CopyMarkdown, CopyLink, FloatingBackButton } from '@/components'
import { HighlightableContent } from '@/components/HighlightableContent'

// Helper function to get other projects
async function getOtherProjects(currentSlug: string): Promise<Project[]> {
  const allProjects = await getAllProjects()
  return allProjects.filter(project => project.id !== currentSlug)
}

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
    const otherProjects = await getOtherProjects(slug)

    return (
      <PageTransition>
        <FloatingBackButton />

        <div className="page-content blog-content mb-16">
          <article>
            <HighlightableContent>
              <div className="prose dark:prose-invert max-w-none">
                <div className="flex items-center justify-between prose time-period text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <div>{metadata.company}</div>
                    <div>•</div>
                    <div>{metadata.date}</div>
                  </div>
                  <div className="copy-actions">
                    <CopyLink title={metadata.title} />
                    <CopyMarkdown 
                      slug={slug} 
                      type="project" 
                      title={metadata.title}
                    />
                  </div>
                </div>
                <h1 className="title-display mb-12 leading-tight">{metadata.title}</h1>
                <Content.default />
              </div>
            </HighlightableContent>
          </article>

          {/* Back to top link */}
          <BackToTop />

          {/* More Projects */}
          {otherProjects.length > 0 && (
            <section className="mt-16 pt-12 border-t border-border">
              <h2 className="text-lg font-medium mb-6 font-serif leading-snug">
                More projects
              </h2>
              <div className="space-y-8">
                {otherProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block group hover:opacity-70 transition-opacity"
                  >
                    <div>
                      <h3 className="text-sm font-medium mb-1">
                        {project.metadata.title}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {project.metadata.description}
                      </p>
                      {/* <div className="flex items-center mt-2">
                        <img 
                          src={project.metadata.company === 'Uniswap Labs' ? "/icons/uniswap.png" : "/icons/tiktok.png"} 
                          alt={project.metadata.company} 
                          className="w-4 h-4 mr-2 rounded-full"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-sm">{project.metadata.company}</span>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-muted-foreground text-sm">{project.metadata.date}</span>
                        </div>
                      </div> */}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </PageTransition>
    )
  } catch {
    notFound()
  }
} 