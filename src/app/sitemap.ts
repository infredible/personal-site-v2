import type { MetadataRoute } from 'next'
import { siteConfig } from '@/app/config/site'
import { getAllPosts } from '@/app/lib/posts'
import { getAllProjects } from '@/app/lib/projects'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url
  const [posts, projects] = await Promise.all([getAllPosts(), getAllProjects()])

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/posts/${post.id}`,
    lastModified: new Date(post.metadata.date),
    changeFrequency: 'yearly',
    priority: 0.7,
  }))

  // Project dates are human-readable ranges ("Ongoing", "2024 - 2025"), not
  // parseable timestamps, so lastModified is intentionally omitted.
  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.id}`,
    changeFrequency: 'yearly',
    priority: 0.9,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    ...projectEntries,
    ...postEntries,
  ]
}
