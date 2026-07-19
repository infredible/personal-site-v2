import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPosts, Post, formatDate } from '@/app/lib/posts'
import Link from 'next/link'
import { siteConfig } from '@/app/config/site'
import { PageTransition, BackToTop, CopyMarkdown, CopyLink, FloatingBackButton } from '@/components'
import { HighlightableContent } from '@/components/HighlightableContent'

// Helper function to get other posts
async function getOtherPosts(currentSlug: string): Promise<Post[]> {
  const allPosts = await getAllPosts()
  return allPosts.filter(post => post.id !== currentSlug)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params
    const { metadata } = await import(`@/app/content/posts/${slug}.metadata`)
    
    // Make base URL optional for development
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate OG image for posts
    const ogUrl = new URL('/api/og', baseUrl)
    ogUrl.searchParams.set('title', metadata.title)
    ogUrl.searchParams.set('date', metadata.date)
    const ogImage = ogUrl.toString()
    
    return {
      title: metadata.title,
      description: metadata.description,
      alternates: {
        canonical: `/posts/${slug}`,
      },
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
    console.error('Post metadata generation error:', error)
    return {}
  }
}

// Only serve slugs registered in lib/posts.ts.
export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.id,
  }))
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const { metadata } = await import(`@/app/content/posts/${slug}.metadata`)
    const Content = await import(`@/app/content/posts/${slug}.mdx`)
    const otherPosts = await getOtherPosts(slug)

    return (
      <PageTransition>
        <FloatingBackButton />

        <div className="page-content blog-content mb-16">
          <article>
            <HighlightableContent>
              <div className="prose dark:prose-invert max-w-none">
                <div className="flex items-center justify-between prose time-period text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <span>{formatDate(metadata.date)}</span>
                    {metadata.tags?.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{metadata.tags.join(', ')}</span>
                      </>
                    )}
                  </div>
                  <div className="copy-actions">
                    <CopyLink title={metadata.title} />
                    <CopyMarkdown 
                      slug={slug} 
                      type="post" 
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

          {/* More Posts */}
          {otherPosts.length > 0 && (
            <section className="mt-16 pt-12 border-t border-border">
              <h2 className="text-lg font-medium mb-6 font-serif leading-snug">
                More thoughts
              </h2>
              <div className="space-y-8">
                {otherPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="block group hover:opacity-70 transition-opacity"
                  >
                    <div>
                      <h3 className="text-sm font-medium mb-1">
                        {post.metadata.title}
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {post.metadata.description}
                      </p>
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