import { metadata as vibecodingAtScaleMetadata } from '@/app/content/posts/vibecoding-at-scale.metadata'
import { metadata as vibecodeNoFigmaMetadata } from '@/app/content/posts/vibecode-no-figma.metadata'
import { metadata as thoughtsOnBrutalistMetadata } from '@/app/content/posts/thoughts-on-the-brutalist.metadata'
import { metadata as predictionsMetadata } from '@/app/content/posts/2025-predictions.metadata'
import { metadata as ripMikealMetadata } from '@/app/content/posts/rip-mikeal.metadata'
import { metadata as gorpcoreAnalysisMetadata } from '@/app/content/posts/gorpcore-analysis.metadata'

export interface PostMetadata {
  title: string
  description: string
  date: string
  tags: string[]
}

export interface Post {
  id: string
  metadata: PostMetadata
}

// Create a lookup object for metadata
const metadataLookup: Record<string, PostMetadata> = {
  'vibecoding-at-scale': vibecodingAtScaleMetadata,
  'vibecode-no-figma': vibecodeNoFigmaMetadata,
  'thoughts-on-the-brutalist': thoughtsOnBrutalistMetadata,
  '2025-predictions': predictionsMetadata,
  'rip-mikeal': ripMikealMetadata,
  'gorpcore-analysis': gorpcoreAnalysisMetadata,
}

export async function getAllPosts(): Promise<Post[]> {
  // Available post slugs
  const postSlugs = ['vibecoding-at-scale', 'vibecode-no-figma', 'thoughts-on-the-brutalist', '2025-predictions', 'rip-mikeal', 'gorpcore-analysis']
  
  const posts = postSlugs.map((slug) => {
    const metadata = metadataLookup[slug]
    if (!metadata) {
      console.error(`No metadata found for post: ${slug}`)
      return null
    }
    
    return {
      id: slug,
      metadata
    }
  }).filter((post): post is Post => post !== null)

  // Sort by date descending (newest first)
  const sortedPosts = posts.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime())
  
  return sortedPosts
}

export async function getPost(slug: string): Promise<Post | null> {
  const metadata = metadataLookup[slug]
  if (!metadata) {
    console.error(`No metadata found for post: ${slug}`)
    return null
  }
  
  return {
    id: slug,
    metadata
  }
}

// Helper function to format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short' 
  })
} 