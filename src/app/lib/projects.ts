import { metadata as swapMetadata } from '@/app/content/projects/swap.metadata'
import { metadata as lpRedesignMetadata } from '@/app/content/projects/lp-redesign.metadata'
import { metadata as tiktokMetadata } from '@/app/content/projects/tiktok.metadata'

export interface ProjectMetadata {
  title: string
  description: string
  date: string
  company: string
  index: number
  ogImage?: string
}

export interface Project {
  id: string
  metadata: ProjectMetadata
}

// Create a lookup object for metadata
const metadataLookup: Record<string, ProjectMetadata> = {
  'swap': swapMetadata,
  'lp-redesign': lpRedesignMetadata,
  'tiktok': tiktokMetadata,
}

export async function getAllProjects(): Promise<Project[]> {
  // Available project slugs - exclude template from public listing
  const projectSlugs = ['swap', 'lp-redesign', 'tiktok']
  
  const projects = projectSlugs.map((slug) => {
    const metadata = metadataLookup[slug]
    if (!metadata) {
      console.error(`No metadata found for project: ${slug}`)
      return null
    }
    
    return {
      id: slug,
      metadata
    }
  }).filter((project): project is Project => project !== null)

  const sortedProjects = projects.sort((a, b) => a.metadata.index - b.metadata.index)
  
  return sortedProjects
}

export async function getProject(slug: string): Promise<Project | null> {
  const metadata = metadataLookup[slug]
  if (!metadata) {
    console.error(`No metadata found for project: ${slug}`)
    return null
  }
  
  return {
    id: slug,
    metadata
  }
} 